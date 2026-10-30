import argparse
import json
import re
import subprocess
import sys


def parse(path):
    epics, errors = [], []
    epic = story = None

    for n, line in enumerate(open(path, encoding="utf-8").read().splitlines(), 1):
        line = line.strip()
        epic_match = re.match(r"^# (E\d+): (.+)$", line)
        story_match = re.match(r"^## (US\d+): (.+)$", line)
        field_match = re.match(r"^(FR|Priority|MVP): (.+)$", line, re.IGNORECASE)
        criterion_match = re.match(r"^- \[ \] (.+)$", line)

        if not line:
            continue
        if epic_match:
            epic = {"title": f"{epic_match[1]}: {epic_match[2]}", "text": "", "stories": []}
            epics.append(epic)
            story = None
        elif story_match:
            if not epic:
                errors.append(f"Line {n}: add an epic (# E1: Title) before the first user story")
                continue
            story = {"title": f"{story_match[1]}: {story_match[2]}", "text": "", "fr": "",
                     "priority": "", "mvp": "", "criteria": [], "line": n}
            epic["stories"].append(story)
        elif line.startswith("#"):
            errors.append(f"Line {n}: use '# E1: Title' for epics and '## US1: Title' for user stories")
        elif not story:
            if epic:
                epic["text"] += line + " "
        elif criterion_match:
            story["criteria"].append(criterion_match[1])
        elif field_match:
            story[field_match[1].lower()] = field_match[2].strip().lower()
        else:
            story["text"] += line + " "

    titles = [e["title"] for e in epics] + [s["title"] for e in epics for s in e["stories"]]
    ids = [t.split(":")[0] for t in titles]
    for i in sorted({i for i in ids if ids.count(i) > 1}):
        errors.append(f"{i} is used more than once")

    for e in epics:
        if not e["stories"]:
            errors.append(f"{e['title']} has no user stories")
        for s in e["stories"]:
            where = f"Line {s['line']}"
            if not s["text"]:
                errors.append(f"{where}: add the sentence As a ... I want ... so that ...")
            if not re.search(r"fr\d+", s["fr"]):
                errors.append(f"{where}: add a line like FR: FR1, FR2")
            if s["priority"] not in ("must", "should", "could"):
                errors.append(f"{where}: add Priority: Must, Should, or Could")
            if s["mvp"] not in ("yes", "no"):
                errors.append(f"{where}: add MVP: yes or MVP: no")
            if not s["criteria"]:
                errors.append(f"{where}: add at least one acceptance criterion (- [ ] ...)")

    if not epics:
        errors.append("No epics found. Start with a line like # E1: Title")
    return epics, errors


def labels(story):
    result = ["user story", "priority: " + story["priority"]]
    return result + ["MVP"] if story["mvp"] == "yes" else result


def body(story):
    criteria = "\n".join("- [ ] " + c for c in story["criteria"])
    return f"{story['text'].strip()}\n\n**FR:** {story['fr'].upper()}\n\n**Acceptance criteria**\n{criteria}"


def gh(*args):
    result = subprocess.run(["gh", *args], capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit("GitHub error: " + result.stderr.strip())
    return result.stdout.strip()


def create(repo, title, text, issue_labels):
    args = ["issue", "create", "--repo", repo, "--title", title, "--body", text]
    for label in issue_labels:
        args += ["--label", label]
    return gh(*args).split("/")[-1]


def main():
    parser = argparse.ArgumentParser(description="Create GitHub issues from user-stories.md")
    parser.add_argument("file", nargs="?", default="user-stories.md")
    parser.add_argument("--check", action="store_true", help="only check the file")
    parser.add_argument("--preview", action="store_true", help="show what would be created")
    parser.add_argument("--repo", help="owner/repo (default: the repository in this folder)")
    args = parser.parse_args()

    epics, errors = parse(args.file)
    if errors:
        print(f"Please fix {len(errors)} problem(s) in {args.file}:")
        print("\n".join("  " + e for e in errors))
        sys.exit(1)

    stories = sum(len(e["stories"]) for e in epics)
    print(f"{args.file} looks good: {len(epics)} epics, {stories} user stories")

    if args.check:
        return
    if args.preview:
        for e in epics:
            print("\n" + e["title"])
            for s in e["stories"]:
                print(f"  {s['title']} ({', '.join(labels(s))})")
        return

    repo = args.repo or gh("repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner")
    for label in ["epic", "user story", "MVP", "priority: must", "priority: should", "priority: could"]:
        gh("label", "create", label, "--repo", repo, "--force")

    issues = json.loads(gh("issue", "list", "--repo", repo, "--state", "all", "--limit", "1000",
                           "--json", "number,title"))
    existing = {i["title"]: str(i["number"]) for i in issues}

    for e in epics:
        epic_number = existing.get(e["title"]) or create(repo, e["title"], e["text"].strip() or "Epic", ["epic"])
        print(f"#{epic_number} {e['title']}")
        for s in e["stories"]:
            if s["title"] in existing:
                print(f"  #{existing[s['title']]} {s['title']} (already exists)")
                continue
            number = create(repo, s["title"], body(s), labels(s))
            issue_id = gh("api", f"repos/{repo}/issues/{number}", "--jq", ".id")
            gh("api", "-X", "POST", f"repos/{repo}/issues/{epic_number}/sub_issues",
               "-F", f"sub_issue_id={issue_id}")
            print(f"  #{number} {s['title']}")

    print(f"Done. See https://github.com/{repo}/issues")


if __name__ == "__main__":
    main()
