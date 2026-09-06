BUSCH PERFORMANCE SETUP ADVISOR - PWA PACKAGE

FILES
-----
index.html             The Setup Change Advisor
manifest.json          Home Screen / PWA app information
service-worker.js      Offline cache
icon-180.png           iPhone Home Screen icon
icon-192.png           Standard PWA icon
icon-512.png           Large PWA icon
icon-maskable-512.png  Maskable PWA icon
logo.png               Transparent Busch Performance logo

NEXT STEP: HOST IT OVER HTTPS
-----------------------------
The easiest free route is GitHub Pages.

1. Create a new GitHub repository, for example: busch-setup-advisor
2. Upload ALL files in this folder to the ROOT of the repository.
3. In the repository, open Settings > Pages.
4. Under Build and deployment, choose "Deploy from a branch".
5. Select the main branch and / (root), then Save.
6. GitHub will provide an https://...github.io/... address.
7. Open that address in Safari on the iPhone.
8. Tap Share > Add to Home Screen > Add.

OFFLINE USE
-----------
Open the installed app at least once while online. The app shell will then be cached for offline use.

UPDATES
-------
When the advisor is changed later, the service-worker cache name should also be changed (for example from v1 to v2) so installed phones reliably download the new version.
