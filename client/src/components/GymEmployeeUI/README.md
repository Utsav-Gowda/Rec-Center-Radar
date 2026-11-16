# Gym Employee UI

`RegisterEquipment.jsx` implements the US7 registration form and displays field
validation and the saved demo employee ID/timestamp. `App.jsx` renders it only
when the API explicitly enables demo mode and the user selects the employee
role. The API independently checks that demo role before accepting a POST.

This is a role simulation, not Pitt Passport authentication. US6 must replace it
with actual employee authentication/authorization. See
[registration documentation](../../../../docs/equipment-registration.md).
