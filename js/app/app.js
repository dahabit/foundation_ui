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

		App.router = new App.Router();
		Backbone.history.start(); // Launches "" router

		// See if we're logged in
		var ui_user_token = false;
		if(useForge){
			forge.prefs.get('ui_user_token',function(ui_user_token){
				if(!ui_user_token){
					App.router.navigate('login', true);
					return;
				}

				// Write base
				App.build_base();

			});
		} else {
			ui_user_token = localStorage.getItem('ui_user_token');
			

			if(!ui_user_token){

				// Popup login modal
				App.router.navigate('login', true);
				return;

			}

			// Write base
			App.build_base();

		}

	}, 

	build_base: function(){


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

	}
};


