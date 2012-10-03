## emailBox  

    mv js/app/creds.js.rename js/app/creds.js
    
Add credentials to `js/app/creds.js`  

### User Interface  

[index.html]()  

Also need to add the api url to the socket.io js so it looks like:

`<script src="https://cryptic-everglades-7999.herokuapp.com/socket.io/socket.io.js"></script>`

### API Console  

[console.html]()


### Trigger.io Native Mobile App

Drop this inside the `src` directory of a [trigger.io](trigger.io) app. Turn on remote debugging by turning on `forge.debug=true;` at the top of `js/app/app.js`. The native app will eventually use Push Notifications, Intents, and other goodies introduced by the trigger folks