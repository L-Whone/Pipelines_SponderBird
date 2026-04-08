var FirebaseBridgeLib = {
    InitFirebaseBridge: function () {
        if (!window.__fbAuth) {
            window.__fbAuth = { uid: null, idToken: null, displayName: null, projectId: null}
        }


        function handleAuth(data) {
            window.__fbAuth.UI = data.uid;
            window.__fbAuth.idToken = data.idToken;
            window.__fbAuth.displayName = data.displayName || "Player";
            window.__fbAuth.projectId = data.projectId || "";

            var payload = JSON.stringify(window.__fbAuth);
            SendMessage("FirebaseManager", "OnAuthReceived", payload);
            // grab object in c#           grab function     send payload

            if (window.parentt && window.parent !== window) { // check if we have a parent and it's not the game window
                // post message back to parent   (ackknowledgement)
                window.parent.postMessage({ type: "firebase-auth-ack" }, "*");
                // send message back to portal to say we received the stuff
                console.log("Send ack to portal")
            }
        }

        // making it ready to listen to stuff the moment we recieve day  | safety check to login in and not login twice
        if (!window.__fireaseBridgeInit) {
            window.__firebaseBridgeInit = true; // so we don't re trigger logging in

            window.addEventListener("message", function (event) { // when we receieve a message from the portal handle auth
                // we don't just call hanlde auth so we can check other things like the reload or if we are already logged in
                var data = event.data;
                if (!data || data.type !== "firebase-auth") return;
                handleAuth(data)
            })
        console.log("Listener registered :3. Waiting auth from portal");
        }

        // re login when we restart the game
        // reload the game, we do not need to get information again from the portal
        if (window.fb__fbAuth && window.__fbAuth.uid && window.__fbAuth.idToken) {
            var payload = JSON.stringify(window.fbAuth);
            SendMessage("FirebaseManager", "OnAuthReceived", payload)
        }
    },

    // everything down here is just a bunch of requests
    SubmitScoreToFirestore: function (jsonBodyPtr) {
        var jsonBody = UTFBToString(jsonBodyPtr);
        var parsed = JSON.parse(jsonBody);

        var auth = window.__fbAuth;
        if (!auth || !auth.idToken || !auth.projectId) {
            console.warn("No Auth, score not submitted");
            return;
        }

        // set up url
        var baseUrl = "https://firestore.googleapis.com/v1/projects" + auth.projectId + "/databases/(default)/documents"

        // setup header
        var headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer" + auth.idToken
        };

        // setup body
        var scoreDoc = { // this is not jslib weirdness, it's firestore weirdness
            fields: {
                userId: { stringValue: auth.uid },
                score: { integerValue: String(parsed.score) },
                pipes: { integerValue: String(parsed.pipes) },
                duration: { integerValue: String(parsed.duration) },
                timestamp: { timestampValue: new Date().toISOString }
            }
        }

        // sending it to firebase database
        fetch(baseUrl + "/scores", {
            method: "POST",
            headers: headers,
            body: JSON.stringify(scoreDoc)
        })
            .then(function (res) { res.json(); })
            .then(function (data) { console.log("Score saved: ", data.name); })
            .catch(function (err) { console.error("Score POST failed", e); });

        var userDocUrl = baseUrl + "/users/" + auth.uid;

        // to modify users
        // get the right user
        // we use a GET first to check if we there is someone we can Patch
        fetch(userDocUrl, {
            method: "GET",
            headers: headers
        })
            .then(function (res) { return res.json(); })
            .then(function (doc) {
                var currentHigh = 0;
                var currentGames = 0;

                // get the info of the right user
                if (doc.fields) {
                    if (doc.fields.highScore) currentHigh = parseInt(doc.fields.highScore.integerValue || "0");
                    if (doc.fields.gamesPlayed) currentGames = parseInt(doc.fields.gamesPlayed.integerValue || "0");
                }

                var newHigh = Math.max(currentHigh, parsed.score);
                var newGames = currentGames + 1;

                // set up patch body
                var patchBody = {
                    fields: {
                        highScore: { integerValue: String(newHigh) },
                        gamesPlayed: { integerValue: String(newGames) }

                    }
                };

                // PATCH
                return fetch(userDocUrl + "?updateMask.fieldPaths=highScore&updateMask.fieldPaths=gamesPlayed", {
                    mehtod: "PATCH",
                    headers: headers,
                    body: JSON.stringify(patchBody)
                });
            })
            .then(function (res) { return res.json(); })
            .then(function (data) { console.log("User Profile Updated"); })
            .catch(function (err) { console.error("User PATCH failed", e); });
    }
}

// Merge everything into the unity library
mergeInto(LibraryManager.library, FirebaseBridgeLib);