//forge.debug = true;

var clog = function(v){
	window.console.log(v);
};

var App = {
	Models:      {},
	Collections: {},
	Views:       {},
	Utils:       {},
	Plugins:     {},
	Data: 		 {},
	Credentials: tmp_credentials,

	// Called once, at app startup
	init: function () {

		var currentUrl = window.location.href;

		// Load apps
		// - including development apps (default?)

		// init Router
		// - not sure if this actually launches the "" position...
		App.router = new App.Router();
		Backbone.history.start(); // Launches "" router

		var ui_user_token = localStorage.getItem('ui_user_token');
		App.Credentials.ui_user_token = ui_user_token;

		if(typeof App.Credentials.ui_user_token != 'string' || App.Credentials.ui_user_token.length < 1){
			App.router.navigate("body_login", true);
			return;
		}

		// Validate credentials
		Api.search({
			data: {
				model: 'Test',
				paths: ['_id'],
				conditions: {},
				limit: 1
			},
			success: function(res){
				var res = JSON.parse(res);
				if(res.code != 200){
					localStorage.setItem('ui_user_token',null);
					App.Credentials.ui_user_token = null;
					App.router.navigate("body_login", true);
					return;
				}

				App.build_base();
			}
		});

		return;

		// See if we're logged in
		var ui_user_token = false;
		if(useForge){
			forge.prefs.get('ui_user_token',function(ui_user_token){
				if(!ui_user_token){
					App.router.navigate('login', true);
					return;
				}

				App.Credentials.ui_user_token = ui_user_token;

				// Build base
				App.build_base();

			});
		} else {
			ui_user_token = localStorage.getItem('ui_user_token');
			
			if(!ui_user_token){

				// Popup login modal
				App.router.navigate('login', true);
				return;

			}

			App.Credentials.ui_user_token = ui_user_token;

			// Build base
			App.build_base();

		}

	}, 

	build_base: function(){

		// Load apps
		Api.loadApps()
		.then(function(loadedApps){
			
			// Firebase init
			Api.Event.start_listening();

			// Basic inbox (start view)
			App.Plugins.Email.saved_searches.accounts()

			.then(function(response){
				// Succeded (no errors)
				// - not doing any error handling, really

				console.log('Accounts');
				console.log(response);

				// Save accounts
				App.Data.accounts = response.success;

				if(useForge){
					// Mobile?

					// Body
					var page = new App.Views.BodyMobile({
						accounts: response.success
					});
					page.render();

					// Email inbox init
					App.Plugins.Email.view.mobile.inbox_init();

					// UI plugin init
					//App.Plugins.UI.Mobile.initialize();


				} else {
					// Website

					// Body
					var page = new App.Views.Body({
						accounts: response.success
					});
					page.render();

					// Email inbox init
					App.Plugins.Email.view.inbox_init();

					// UI plugin init
					App.Plugins.UI.initialize();
				}

			});

		});

	}
};


