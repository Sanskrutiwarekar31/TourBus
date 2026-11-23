# TourBus – Passenger Booking Validation System

A responsive passenger booking form built with React, Vite, JavaScript, and CSS. It demonstrates browser-side validation only: it does not call an API, create a booking, or save passenger data.

## Run in VS Code

1. Open the repository in VS Code and open the integrated terminal.
2. Change to this project folder:

   ```powershell
   cd .\react-client-validation
   ```

3. Install dependencies and start Vite:

   ```powershell
   npm install
   npm run dev
   ```

4. Open the local URL printed by Vite (usually `http://localhost:5173`).

To check the production build locally, run `npm run build` followed by `npm run preview`.

## Client-side validation

Validation lives in `src/App.jsx`:

- `fieldValidators` contains the rules and required field-specific messages.
- `validateForm` checks every field when the form is submitted.
- `handleSubmit` calls `preventDefault()`, updates errors, and only shows the success summary when all values are valid.
- `updateField` captures input changes, clears a corrected field's error after the first submit, and hides an outdated success result.
- `handleReset` restores the initial values and clears errors and success state.
- `getToday` uses the browser's local date for the journey date minimum and validation.
- `useState` stores the form values, errors, whether validation has been attempted, and whether the current values passed.
- JSX conditional rendering shows field errors and the successful validation summary.

`src/App.css` contains the responsive TourBus interface and validation/success states. `src/index.css` contains global styles and focus indicators.

The sidebar uses a locally bundled bus photo at `public/bus-travel.jpg`, sourced from [Unsplash](https://unsplash.com/license) under the Unsplash License.

## Try the validation

1. Submit the empty form to see an error below every required field.
2. Try `rahulgmail.com` as the email address, or a mobile number such as `12345`.
3. Enter age `150`; only ages from 5 through 100 are accepted.
4. Choose a past date (past dates are disabled in the date picker and rejected by validation).
5. Leave the bus, seat, or terms checkbox incomplete to see its individual error.
6. Correct an invalid field; after the first validation attempt, its error clears as soon as its value is valid.
7. Enter a name of at least three characters without digits, a valid email, a 10-digit Indian mobile number starting with 6–9, age from 5 to 100, a bus, a date today or later, a seat, and accept the terms. The green validation summary appears.
8. Select **Reset Form** to clear all values, errors, and the summary.

The summary is a local demonstration only. No booking is submitted or stored.

## Push to GitHub

From the repository root, stage only this application so the existing TourBus site is not included by mistake:

```powershell
git add .\TourBus-Express-Server-Validation\TourBus\react-client-validation
git commit -m "Add React passenger validation demo"
git push origin <your-branch>
```

If your repository is already rooted in the TourBus folder, use `git add .\react-client-validation` instead. Confirm `git status` before committing.

## Deploy on Render (Static Site)

1. Push the project to GitHub and create a **Static Site** in Render connected to that repository.
2. Set **Root Directory** to `TourBus-Express-Server-Validation/TourBus/react-client-validation` if the Git repository root is above the TourBus folder. If the repository root is the TourBus folder, set it to `react-client-validation`.
3. Set the build command to:

   ```text
   npm install && npm run build
   ```

4. Set the publish directory to:

   ```text
   dist
   ```

5. Create the Static Site. Render installs the dependencies, runs the Vite production build, and publishes `dist`.
