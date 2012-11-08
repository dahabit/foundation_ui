
App.Router = Backbone.Router.extend({

	routes: {
		
		'' : 'inbox',         // entry point: no hash fragment or #

		'body_login' : 'body_login',
		
		'inbox' : 'inbox',
		'thread/:thread_id' : 'thread',
		'thread_mobile/:thread_id' : 'thread_mobile',

		'email/compose' : 'email_compose',

		'contacts' : 'contacts',
		'contact/:contact_id' : 'contact_view',

		'login' : 'login',
		'logout' : 'logout'
		
	},

	showView: function(hash,view){
		// Used to discard zombies
		if (!this.currentView){
			this.currentView = {};
		}
		if (this.currentView && this.currentView[hash]){
			this.currentView[hash].close();
		}
		this.currentView[hash] = view.render();
	},


	body_login: function(){
		// Redirect through OAuth

		// Unless user_token is already in querystring

		if(typeof App.Credentials.ui_user_token != 'string' || App.Credentials.ui_user_token.length < 1){

			var qs = App.Utils.getUrlVars();

			if(typeof qs.user_token == "string"){
				// Have a user_token
				// - save it to localStorage

				localStorage.setItem('ui_user_token',qs.user_token);
				
				// Reload page, back to #home
				window.location = [location.protocol, '//', location.host, location.pathname].join('');
			} else {
				// Show login splash screen
				var page = new App.Views.BodyLogin();
				App.router.showView('bodylogin',page);
			}

		} else {
			// Reload page, back to #home
			window.location = [location.protocol, '//', location.host, location.pathname].join('');
			return;
		} 

	},


	login: function(){
		// Logout, if necessary
		localStorage.clear();
		
		// Modal popup
		var page = new App.Views.Login({
			
		});
		page.render();

	},


	logout: function(){
		// Logout

		// alert('Logging out');

		// Reset user_token
		localStorage.setItem('ui_user_token','');
		
		window.location = [location.protocol, '//', location.host, location.pathname].join('');

	},


	// Not Logged In
	inbox: function() {
		
		// Get startup data


		// Logic here should be merged/hashed as a "query_definition" or something that can be referenced and stored in localStorage
		// - new results augment existing results?
		// - Flow:
		//	- check localStorage (load that data first)
		//	- check server for newer whatevers (messages, contacts, etc.) and add those just like they were showing up later
		//		- if localStorage is empty or expired, then make this query and block other stuff?

		// Make sure Inbox is visible
		$('.page').addClass('nodisplay');
		$('#threads').removeClass('nodisplay');

		// Scroll to correct position
		var t = $('#threads').attr('data-yscroll');
		window.scrollTo(0,parseInt(t));

		return;
		
	},


	thread: function(thread_id){

		// Get an individual Thread

		App.Plugins.Email.saved_searches.thread(thread_id)

		.then(function(response){
			// Succeded (no errors)
			// - not doing any error handling, really
			
			// Send this data to Views.Thread

			var page = new App.Views.Thread({
				thread: response.success
			});
			App.router.showView('thread-emails',page);


			// Send this data to Views.Thread
			//App.router.closeView('thread-details');
			var page2 = new App.Views.ThreadDetails({
				thread: response.success
			});
			App.router.showView('thread-details',page2);

		});

		return;

	},


	thread_mobile: function(thread_id){

		// Get an individual Thread

		App.Plugins.Email.saved_searches.thread(thread_id)

		.then(function(response){
			// Succeded (no errors)
			// - not doing any error handling, really
			
			// Send this data to Views.Thread

			var page = new App.Views.ThreadMobile({
				thread: response.success
			});
			App.router.showView('thread-emails',page);

			window.scrollTo(0,0);

			// Send this data to Views.Thread
			//App.router.closeView('thread-details');
			var page2 = new App.Views.ThreadDetails({
				thread: response.success
			});
			App.router.showView('thread-details',page2);

		});

		return;

	},


	// Not Logged In
	contacts: function() {

		// Run contact search
		App.Plugins.Contact.saved_searches.contacts()

		.then(function(response){
			// Succeded (no errors)
			// - not doing any error handling, really
			
			// Send this data to Views.Thread

			var page = new App.Views.ContactBook({
				contacts: response.success
			});
			App.router.showView('contact-book',page);

		});

		return;


		// All Contacts
		// - should be stored in LocalStorage?
		window.setTimeout(function(){
			$.ajax({
				url: '/contacts/all',
				type: 'GET',
				dataType: 'json',
				success: function (json){
					
					// Send this data to Views.Inbox
					var page = new App.Views.ContactBook({
						contacts: json
					});
					page.render();

				}
			});
		},1000);

	},


	contact_view: function(contact_id){

		// Get an individual Contact

		// All Emails
		$.ajax({
			url: '/contacts/view/' + contact_id,
			type: 'GET',
			dataType: 'json',
			success: function (json){
				
				// Send this data to Views.Inbox
				var page = new App.Views.ContactView({
					contact: json
				});
				page.render();

			}
		});

	},


	email_compose: function(){

		// Open up the Compose view

		// Send this data to Views.Inbox
		// - timeout waits for page to finish loading
		window.setTimeout(function(){
			var page = new App.Views.EmailCompose({
				// no data to send
			});
			page.render();
		},1000);

	}


});
