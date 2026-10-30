# AZoom Car Rental — Assignment 2

**Live website:** https://babaovo.github.io/azoom-car-rental/

This is a front-end car rental website developed with HTML, CSS and JavaScript. It demonstrates the complete AZoom rental process required by the assignment:

1. A customer searches for and reserves a car using a demo credit card.
2. The customer collects the car from an AZoom office.
3. The customer returns the car to a designated car park.
4. An employee inspects the returned vehicle and records any damage.
5. The customer receives and pays a final bill containing rental and damage costs.

No backend or database is used. Vehicle data, the current booking, customer accounts and the active login session are stored in JavaScript and the browser's `localStorage`. The account system is for classroom demonstration only.

## Project files

- `index.html` — website structure and all customer/staff sections
- `styles.css` — visual design, responsive layout and print styles
- `app.js` — vehicle data, account registration and login, validation, calculations and rental status logic
- `assets/cars/` — local, optimised realistic vehicle photographs used throughout the website
- `favicon.svg` — small AZoom browser-tab icon

## Run the website

The website can be opened directly by double-clicking `index.html`. For a local web server, open a terminal in the project folder and run:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Demo instructions

Use the following order to show the complete workflow:

1. Select **Log in** in the header and create a classroom demo account.
2. Log out and log in again with the same email and password to demonstrate account persistence.
3. Open **Cars** and select an available vehicle.
4. Choose trip dates and optional extras.
5. Confirm that the account name and email were filled automatically, then enter the remaining driver details.
6. On the demo card form, use:
   - Card number: `4242 4242 4242 4242`
   - Any future expiry date, for example `12/28`
   - Any three-digit CVV, for example `123`
7. Open **My Rental** and click **Confirm car collection**.
8. Enter the odometer and confirm the return car park.
9. Open **Staff Portal** and complete the inspection.
10. Choose either no damage or enter a damage description and cost.
11. Return to **My Rental**, review the final bill and complete payment.

Use **Reset demo data** in the footer when you want to start again.

> This is a classroom demonstration only. It does not process real payments, does not store a full card number or CVV, and does not provide secure server-side authentication. Account data is stored only in this browser, so do not use a real password.

## GitHub Pages deployment

The public website is deployed from the `main` branch with GitHub Pages.

