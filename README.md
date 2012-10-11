## emailbox  

Most recent screenshot: 
![screen1](https://dl.dropbox.com/u/6673634/Screenshots/emailbox_screen1.png)  

### Installing  

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

## Todo  
1. Refactor using models, smarter views, lessons learned from http://addyosmani.github.com/backbone-fundamentals/  
1. Add Contacts page
1. Develop App/plugin architecture and loading mechanisms (pre-build, js/css/templates)  
1. Redesign - maybe http://ace-subido.github.com/css3-microsoft-metro-buttons/buttons.html