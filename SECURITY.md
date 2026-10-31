# Security

## Reporting a problem

Please use **Report a vulnerability** on the [Security tab](https://github.com/Sash3n/investment_calculator/security) rather than opening a public issue. Include the steps to reproduce it.

## How the app is protected

- **Your data:** saved data sits under your own Firebase user ID. The rules in [`firestore.rules`](firestore.rules) let only you read or write it, and deny everything else.
- **Sign-in:** handled by Firebase Auth with Google. The app never sees your password.
- **On your device:** inputs that calculators remember stay in your browser's local storage.
- **In the browser:** a strict Content Security Policy, HSTS, and frame and content type protections are set for every page.
- **Share links:** the values in a link are treated as untrusted and checked before use.
- **Firebase config:** the `VITE_FIREBASE_*` values are public identifiers that ship in the browser bundle, not secrets. No private keys are kept in this repository.

## Supported versions

Only the latest release on `main` receives fixes.
