Backbone.View.prototype.close = function () {
	if (this.beforeClose) {
		this.beforeClose();
	}
	//this.remove();
	//this.unbind();
};


Backbone.View.prototype.garbage = function (view_list) {
	// Trash views that are not currently needed

	// passes in a view_list of things to trash



};


App.Views.Body = Backbone.View.extend({
	
	el: 'body',

	events: {
		'click .goto_inbox': 'goto_inbox',
		'click .goto_contacts': 'goto_contacts',
		'click #main-toolbar .btn[btn-action="compose"]' : 'compose', // composing new email,

		// Accounts
		'click .accountTab .search': 'search',
		'click #accounts .switchTo' : 'switch_to',

		// Developer
		'click .dev_apps' : 'apps'
	},

	initialize: function() {
		_.bindAll(this, 'render');
	},

	goto_inbox: function(ev){
		//App.router.navigate("inbox", true);
		App.Plugins.Email.view.inbox_refresh();
	},

	goto_contacts: function(ev){
		App.router.navigate("contacts", true);
	},

	compose: function(ev){

		var elem = ev.currentTarget;

		// Compose a new Email message
		// - brings up a new View?

		App.router.navigate("email/compose", true);

	},

	switch_to: function(ev){
		
		// Switch to Email or Contacts
		var elem = ev.currentTarget;
		

		var dtype = $(elem).attr('data-type');
		
		var err = false;
		switch(dtype){
			case 'email':
				$('#current-account span.text').text('Email');
				// Run the Email Switcher View
				// - clears the body, etc.?



				break;
			case 'contacts':
				$('#current-account span.text').text('Contacts');
				App.router.navigate("contacts", true);
				break;
			default:
				err = true;
				break;
		}
		
		if(err === true){
			// No error
			// - change icon
			return false;
		}
		
		// Change icon
		$('.switchTo').removeClass('active');
		$(elem).addClass('active');

	},


	search: function(ev){
		// Searching under a new Account (Gmail, nivico. etc.)

		var elem = ev.currentTarget;

		// Get address to search on
		var address = $(elem).parents('.accountTab').attr('data-address');

		// Get label to search on
		var label = $(elem).attr('data-search-label');

		// Searching against this account

		// Build search string
		var conditions = {};

		if(address.length > 0){
			conditions['attributes.accounts.'+App.Utils.MD5(address)] = 1;
		}

		if(label.length > 0){
			conditions['attributes.labels.'+label] = 1;
		}

		// Change colors
		$(elem).parents('#main-toolbar').find('.accountTab .search').removeClass('active');
		$(elem).addClass('active');

		// Call Plugin inbox search
		// - does updating also
		App.Plugins.Email.view.inbox_change(conditions);

	},

	apps: function(ev){
		// List apps
		
		Api.query('/api/apps',{
			data: {},
			success: function(response){

				try {
					var json = $.parseJSON(response);
				} catch (err){
					alert("Failed parsing JSON");
					return;
				}

				// Check the validity
				if(json.code != 200){
					// Expecting a 200 code returned
					console.log('200 not returned');
					return;
				}

				var apps = json.data;

				$.each(apps,function(i,app){

					// Load app scripts
					// - load from dev, if specified in localStorage

					var tmp = localStorage.getItem('app_' + app.id + '_dev');
					if(tmp == 1){
						apps[i].dev = true;
					} else {
						apps[i].dev = false;
					}

				});

				var page = new App.Views.DevApps({
					apps: apps
				});
				App.router.showView('apps',page);

			}
		});
		
		return false;
	},


	render: function() {

		// Data
		var data = this.options.accounts.UserGmailAccounts;

		// Should start the updater for accounts
		// - have a separate view for Accounts?

		// Template
		var template = App.Utils.template('t_body');

		// Write HTML
		$(this.el).html(template(data));

		return this;
	}
});


App.Views.BodyMobile = Backbone.View.extend({
	
	el: 'body',

	events: {
		'click .navigation': 'navigation'

	},

	initialize: function() {
		_.bindAll(this, 'render');
	},

	navigation: function(ev){
		//App.router.navigate("inbox", true);
		App.Plugins.Email.view.inbox_refresh();
	},

	render: function() {

		// Data
		var data = this.options.accounts;

		// Template
		var template = App.Utils.template('t_body_mobile');

		// Write HTML
		$(this.el).html(template(data));

		return this;
	}
});


App.Views.Login = Backbone.View.extend({
	
	el: 'body',

	events: {
		'click button' : 'post', // composing new email,

	},

	initialize: function() {
		_.bindAll(this, 'render');
	},

	post: function(ev){
		// Post to /api/login

		var elem = ev.currentTarget;

		// Hide error message
		$(this.el).find('.alert').addClass('nodisplay');
		
		// Make login request
		Api.login({
			data: form2js('FormLogin'),
			success: function(response){
				// Save the user_token

				try {
					var json = $.parseJSON(response);
				} catch (err){
					alert("Failed parsing incoming request");
					return;
				}

				// Check validity
				if(json.code != 200){
					// Expecting a 200 code returned

					// Mark up form
					$('body').find('.alert').text(json.msg).removeClass('nodisplay');
					return;
				}

				// Set user_token
				if(useForge){
					forge.prefs.set('ui_user_token',json.data.user_token);
				} else {
					localStorage.setItem('ui_user_token',json.data.user_token);
				}


				// Reload page
				console.log(window.location.href.split('#')[0]);
				window.location = window.location.href.split('#')[0];

			}
		});

		return false;

	},

	render: function() {

		var template = App.Utils.template('t_login');
		//$('body').append(template());

		// Write HTML
		$(this.el).html(template());

		return this;
	}
});


App.Views.DevApps = Backbone.View.extend({
	
	el: 'body',

	events: {
		'click .dev': 'dev_toggle'
	},

	initialize: function() {
		_.bindAll(this, 'render');
	},

	dev_toggle: function(ev){
		// Toggle dev mode for an app
		var elem = ev.currentTarget;
		
		var dev = 1;

		if($(elem).attr('data-dev') == 1){
			// Switching to local
			console.log('switching to local');

			// Test if manifest.json exists locally

			$.ajax({
				url: './apps/' + $(elem).attr('data-id') + '/manifest.json',
				cache: false,
				error: function(err){
					// Unable to find manifest.json

					App.Utils.noty({
						text: "Unable to find manifest.json locally",
						type: "error"
					});

				},
				success: function(rManifest){

					// Update
					localStorage.setItem('app_' + $(elem).attr('data-id') +'_dev',1);
					$(elem).parent().find('.server').removeClass('on');
					$(elem).parent().find('.local').addClass('on');

				}
			});

			
		} else {
			// Switching to server
			console.log('switching to server');

			localStorage.setItem('app_' + $(elem).attr('data-id') +'_dev',null);
			$(elem).parent().find('.server').addClass('on');
			$(elem).parent().find('.local').removeClass('on');
		}

		App.Utils.noty({
			text: "Reload window to see changes",
			buttons2: [
				{
					addClass: 'btn btn-primary',
					text: 'Reload',
					onClick: function($noty) {

						window.location = window.location.href.split('#')[0];

				  }
				},
			]
		});

		return false;
	},

	render: function() {

		// Data
		var data = this.options.apps;

		// Should start the updater for accounts
		// - have a separate view for Accounts?

		// Remove any previous version
		$('#modalApps').remove();

		var template = App.Utils.template('t_modal_apps');
		$('body').append(template(data));

		$('#modalApps').modal();

		//console.log(data);

		return this;
	}
});


App.Views.Inbox = Backbone.View.extend({
	
	el: '.pane-threads div.pane-content',

	events: {

		// Compose (action)
		'click .actions.actions-threads-all .btn[btn-action="compose"]' : 'compose', // composing new email

		// threads
		'click .thread-preview .chkbox': 'chkbox', // checkbox
		'click .thread-preview .starred': 'starred', // star
		'click .thread-preview .content': 'thread_preview', // viewing thread
		'click .thread-preview .last_message': 'thread_preview', // viewing thread
		'click .thread-preview .received': 'thread_preview', // viewing thread

		// actions
		'click .actions.actions-threads-all .btn[btn-action="archive"]' : 'archive', // archiving multiple
		'click .actions.actions-threads-all .btn[btn-action="read"]' : 'read' // marking multiple as read
	},

	initialize: function() {
		_.bindAll(this, 'render');
	},

	thread_preview: function(ev) {
		// Display the selected thread
		var elem = ev.currentTarget;
		
		// Get hash
		var id = $(elem).parents('.thread-preview').attr('data-thread-hash');
		var read = $(elem).parents('.thread-preview').attr('data-thread-read');
		
		// Mark as Read
		// - only if not already marked
		if(read != 1){

			// Change status on page
			$(elem).parents('.thread-preview').attr('data-thread-read',1);

			// Api/update
			Api.update({
				data: {
					model: 'Thread',
					id: id,
					paths: {
						"attributes.read.status": 1
					}
				},
				success: function(response){
					console.log('Saved Read.status');
				}
			});
		}

		// Navigate
		App.router.navigate("thread/" + id, true);

	},

	chkbox: function(ev){
		var elem  = ev.currentTarget;

		if($(elem).parents('.select').hasClass('selected')){
			$(elem).parents('.select').removeClass('selected');
		} else {
			$(elem).parents('.select').addClass('selected')
		}

		// Any others selected?
		// - change actions "disabled" status if none are selected
		if($('.thread-preview .select.selected').length <= 0){
			$('.actions.actions-threads-all .btn').addClass('disabled');
		} else {
			$('.actions.actions-threads-all .btn').removeClass('disabled');
		}
	},

	starred: function(ev){
		var elem = ev.currentTarget;

		// Get hash
		var id = $(elem).parent().attr('data-thread-hash');

		// Starring, or unstarring?
		var starred = $(elem).attr('data-starred');

		if(starred == 1){
			// Star
			starred = 0;
		} else {
			// Un-star
			starred = 1;
		}

		$(elem).attr('data-starred',starred);

		// Make query to update Thread
		Api.update({
			data: {
				model: 'Thread',
				id: id,
				paths: {
					"attributes.starred": starred
				}
			},
			success: function(response){
				//console.log(response);
			}
		});

	},

	compose: function(ev){

		var elem = ev.currentTarget;

		// Compose a new Email message
		// - brings up a new View?

		App.router.navigate("email/compose", true);

	},

	archive: function(ev){
		var elem = ev.currentTarget;

		// Get all selected threads

		var thread_ids = [];

		$('.thread-preview .select.selected').each(function(i,tmp_elem){
			thread_ids.push($(tmp_elem).parents('.thread-preview').attr('data-thread-hash'));
		});

		if(thread_ids.length <= 0){
			console.log('No threads selected');
			return;
		}

		// Build update query
		var query = {
			model: 'Thread',
			id: thread_ids,
			paths: {
				"attributes.labels.inbox" : 0
			}
		};

		// Make update query
		Api.update({
			data: query,
			success: function(response){
				//console.log(response);
			}
		});

		// Remove entries from table
		$('.thread-preview .select.selected').each(function(i,tmp_elem){
			$(tmp_elem).parents('.thread-preview').remove();
		});

	},

	read: function(ev){
		// Mark a bunch of Threads as "read" -> read.status=1
		var elem = ev.currentTarget;

		var thread_ids = [];

		// Get threads to modify
		$('.thread-preview .select.selected').each(function(i,tmp_elem){
			thread_ids.push($(tmp_elem).parents('.thread-preview').attr('data-thread-hash'));
		});

		if(thread_ids.length <= 0){
			console.log('No threads selected');
			return;
		}

		// Build update query
		var query = {
			model: 'Thread',
			id: thread_ids,
			paths: {
				"attributes.read.status" : 1
			}
		};

		// Make update query
		Api.update({
			data: query,
			success: function(response){
				//console.log(response);
			}
		});

		// Alter table
		// - this should be done automatically by Backbone.sync ?
		$('.thread-preview .select.selected').each(function(i,tmp_elem){
			$(tmp_elem).parents('.thread-preview').attr('data-thread-read',1);
		});

	},

	render: function() {

		// Data
		var data = this.options.threads;

		// Template
		var template = App.Utils.template('t_threads_all');
		
		// Write HTML
		$(this.el).html(template(data));
		
		// Autoellipsis
		$('.autoellipsis').ellipsis();

		// Hide sub windows
		// - todo

		// Add Fake images where necessary
		App.Utils.fake_image();

		return this;
	}
});



App.Views.InboxMobile = Backbone.View.extend({
	
	el: '#threads',

	events: {

		// Compose (action)
		//'click .actions.actions-threads-all .btn[btn-action="compose"]' : 'compose', // composing new email

		// threads
		/*'click .thread-preview .content': 'thread_preview', // viewing thread
		'click .thread-preview .last_message': 'thread_preview', // viewing thread
		'click .thread-preview .received': 'thread_preview', // viewing thread
		*/
		'click .thread-preview > div': 'thread_preview', // viewing thread

		// actions
		//'click .actions.actions-threads-all .btn[btn-action="archive"]' : 'archive', // archiving multiple
		//'click .actions.actions-threads-all .btn[btn-action="read"]' : 'read' // marking multiple as read
	},

	initialize: function() {
		_.bindAll(this, 'render');
	},

	thread_preview: function(ev) {
		// Display the selected thread
		var elem = ev.currentTarget;
		
		// Get hash
		var id = $(elem).parents('.thread-preview').attr('data-thread-hash');
		var read = $(elem).parents('.thread-preview').attr('data-thread-read');
		
		// Mark as Read
		// - only if not already marked
		if(read != 1){

			// Change status on page
			$(elem).parents('.thread-preview').attr('data-thread-read',1);

			// Api/update
			Api.update({
				data: {
					model: 'Thread',
					id: id,
					paths: {
						"attributes.read.status": 1
					}
				},
				success: function(response){
					console.log('Saved Read.status');
				}
			});
		}

		// Save scroll position
		var t = window.pageYOffset;
		$(this.el).attr('data-yscroll',t);

		// Navigate
		App.router.navigate("thread_mobile/" + id, true);

	},

	render: function() {

		// Data
		var data = this.options.threads;

		// Template
		var template = App.Utils.template('t_threads_all');
		
		// Write HTML
		$(this.el).html(template(data));
		
		// Autoellipsis
		$('.autoellipsis').ellipsis();

		// Hide sub windows
		// - todo

		// Add Fake images where necessary
		App.Utils.fake_image();

		// Hide other main-windows
		$('.page').addClass('nodisplay');
		$(this.el).removeClass('nodisplay');

		return this;
	}
});


App.Views.Threads = Backbone.View.extend({
	
	el: '#threads-all',

	events: {
		// threads
		'click .thread-preview .chkbox': 'chkbox', // checkbox
		'click .thread-preview .starred': 'starred', // star
		'click .thread-preview .content': 'thread_preview', // viewing thread
		'click .thread-preview .last_message': 'thread_preview', // viewing thread
		'click .thread-preview .received': 'thread_preview', // viewing thread
	},

	initialize: function() {
		_.bindAll(this, 'render');
	},

	thread_preview: function(ev) {
		// Display the selected thread
		var elem = ev.currentTarget;
		
		// Get hash
		var id = $(elem).parents('.thread-preview').attr('data-thread-hash');
		var read = $(elem).parents('.thread-preview').attr('data-thread-read');
		
		// Mark as Read
		// - only if not already marked
		if(read != 1){

			// Change status on page
			$(elem).parents('.thread-preview').attr('data-thread-read',1);

			// Api/update
			Api.update({
				data: {
					model: 'Thread',
					id: id,
					paths: {
						"attributes.read.status": 1
					}
				},
				success: function(response){
					console.log('Saved Read.status');
				}
			});
		}

		// Navigate
		App.router.navigate("thread/" + id, true);

	},

	chkbox: function(ev){
		var elem  = ev.currentTarget;

		if($(elem).parents('.select').hasClass('selected')){
			$(elem).parents('.select').removeClass('selected');
		} else {
			$(elem).parents('.select').addClass('selected')
		}

		// Any others selected?
		// - change actions "disabled" status if none are selected
		if($('.thread-preview .select.selected').length <= 0){
			$('.actions.actions-threads-all .btn').addClass('disabled');
		} else {
			$('.actions.actions-threads-all .btn').removeClass('disabled');
		}
	},

	starred: function(ev){
		var elem = ev.currentTarget;

		// Get hash
		var id = $(elem).parent().attr('data-thread-hash');

		// Starring, or unstarring?
		var starred = $(elem).attr('data-starred');

		if(starred == 1){
			// Star
			starred = 0;
		} else {
			// Un-star
			starred = 1;
		}

		$(elem).attr('data-starred',starred);

		// Make query to update Thread
		Api.update({
			data: {
				model: 'Thread',
				id: id,
				paths: {
					"attributes.starred": starred
				}
			},
			success: function(response){
				//console.log(response);
			}
		});

	},

	compose: function(ev){

		var elem = ev.currentTarget;

		// Compose a new Email message
		// - brings up a new View?

		App.router.navigate("email/compose", true);

	},

	archive: function(ev){
		var elem = ev.currentTarget;

		// Get all selected threads

		var thread_ids = [];

		$('.thread-preview .select.selected').each(function(i,tmp_elem){
			thread_ids.push($(tmp_elem).parents('.thread-preview').attr('data-thread-hash'));
		});

		if(thread_ids.length <= 0){
			console.log('No threads selected');
			return;
		}

		// Build update query
		var query = {
			model: 'Thread',
			id: thread_ids,
			paths: {
				"attributes.labels.inbox" : 0
			}
		};

		// Make update query
		Api.update({
			data: query,
			success: function(response){
				//console.log(response);
			}
		});

		// Remove entries from table
		$('.thread-preview .select.selected').each(function(i,tmp_elem){
			$(tmp_elem).parents('.thread-preview').remove();
		});

	},

	read: function(ev){
		// Mark a bunch of Threads as "read" -> read.status=1
		var elem = ev.currentTarget;

		var thread_ids = [];

		// Get threads to modify
		$('.thread-preview .select.selected').each(function(i,tmp_elem){
			thread_ids.push($(tmp_elem).parents('.thread-preview').attr('data-thread-hash'));
		});

		if(thread_ids.length <= 0){
			console.log('No threads selected');
			return;
		}

		// Build update query
		var query = {
			model: 'Thread',
			id: thread_ids,
			paths: {
				"attributes.read.status" : 1
			}
		};

		// Make update query
		Api.update({
			data: query,
			success: function(response){
				//console.log(response);
			}
		});

		// Alter table
		// - this should be done automatically by Backbone.sync ?
		$('.thread-preview .select.selected').each(function(i,tmp_elem){
			$(tmp_elem).parents('.thread-preview').attr('data-thread-read',1);
		});

	},

	render: function() {

		// Data
		var data = this.options.threads;

		// Template
		var template = App.Utils.template('t_threads_all');
		
		// Write HTML
		$(this.el).html(template(data));
		
		// Autoellipsis
		$('.autoellipsis').ellipsis();

		// Hide sub windows
		// - todo

		// Add Fake images where necessary
		App.Utils.fake_image();

		return this;
	}
});


App.Views.Thread = Backbone.View.extend({
	
	el: '.pane-messages div.pane-content',

	thread_id: 0,

	events: {
		//'click .thread-preview': 'thread_preview'
		'click .thread-view .thread_explore' : 'thread_explore',
		'click .thread-view .email .details .addresses' : 'minimize',
		'click .thread-view .actions .btn[btn-action="back"]' : 'back',
		'click .thread-view .email .options .reply' : 'quick_reply',
		//'click .thread-view .email .options .info' : 'info',
		'click .thread-view .email .options .info' : 'info_explore', // replaced 'info' with the Explorer
		'click .thread-view .email .info_holder .explore' : 'info_explore',
		'click .thread-view .email .ParsedDataShowAll span' : 'email_folding'
	},

	initialize: function() {
		this.$el.unbind(); // Unbind everything, fuck
		_.bindAll(this, 'render');
	},


	minimize: function(ev){
		
		// Get elem
		var elem = ev.currentTarget;
		var $email = $(elem).parents('.email');
		// Open or close?
		if($email.attr('data-open-state') == 'open'){
			// Close it
			$email.attr('data-open-state','closed');
		} else {
			// Open it
			$email.attr('data-open-state','open');
		}

	},


	back: function (ev){

		// Back to Inbox
		// - or go back to search results?

		// Should open the Inbox or Search page, which, if empty, reloads (or just displays the previous data)
		// - searches that are changed (removed a value or a key) should auto-update?

		App.router.navigate("inbox", true);

	},


	info: function (ev){
		// Used to toggle messages, now we're using info_explore directly instead
		return false;

		// Toggle displaying the Headers for the message
		var elem = ev.currentTarget;

		var info_holder = $(elem).parents('.email').find('.info_holder');

		if($(info_holder).hasClass('nodisplay')){
			$(info_holder).removeClass('nodisplay')
		} else {
			$(info_holder).addClass('nodisplay')
		}


	},


	thread_explore: function(ev){

		var elem = ev.currentTarget;

		var thread_id = $(elem).parents('.thread-view').attr('data-thread-hash');

		// Run search

		App.Utils.explore({
			'model' : 'Thread',
			'_id' : thread_id
		});

		return false;

	},


	info_explore: function(ev){
		// Modal popup with Entity Browser for Email

		var elem = ev.currentTarget;

		var email_id = $(elem).parents('.email').attr('data-id');

		// Run search

		App.Utils.explore({
			'model' : 'Email',
			'_id' : email_id
		});

		return false;

	},


	email_folding: function (ev){
		// Display any hidden emails (previous parts of the conversation)

		var elem = ev.currentTarget;

		var content_holder = $(elem).parents('.content');
		//var count = $(content_holder).find('.ParsedDataContent').length;

		// Toggle
		if($(content_holder).hasClass('showAllParsedData')){
			$(content_holder).removeClass('showAllParsedData')
			
			$(content_holder).find('.ParsedDataContent:not([data-level="0"])').fold({collapse: true});

			$(elem).text('...');
		} else {
			$(content_holder).addClass('showAllParsedData')

			//$(content_holder).find('.ParsedDataContent:not([data-level="0"])').unfold();
			$(content_holder).find('.ParsedDataContent:not([data-level="0"])').unfold();

			$(elem).text('Hide');
		}


	},


	quick_reply: function(ev){
		// Quick Reply to a message
		// - no Subject, etc. Just simple options

		var elem = ev.currentTarget;
		var $email_elem = $(elem).parents('.email');

		// Add ComposeQuick above the email (slide in)
		// - if already out, hide

		//if($(elem).parents('.email')

		// Email.id

		var query = 
		{
			"model" : "Email",
			"paths" : [""], // Whole Entity
			"conditions" : {
				"id" : $email_elem.attr('data-id')
			},
			"limit" : 100,
			"offset" : 0 // Pagination
		};

		Api.search({
			data: query,
			success: function(response){

				try {
					var json = $.parseJSON(response);
				} catch (err){
					alert("Failed parsing JSON");
					return;
				}

				// Check the validity
				if(json.code != 200){
					// Expecting a 200 code returned
					console.log('200 not returned');
					return;
				}

				// Get the Email data
				json.data = json.data[0];
				var page = new App.Views.EmailComposeQuick({
					$email_elem: $email_elem,
					email: json.data
				});
				page.render();

			}
		});
		
	},


	render: function() {

		// Data
		var data = this.options.thread;

		this.thread_id = this.options.thread.Thread._id

		// Template
		var template = App.Utils.template('t_thread_view');

		// Shrink/minimize the threads that are not the latest (don't want to have to keep scrolling down)
		// - todo (v2)

		// Write HTML
		$(this.el).html(template(data));

		// Hide other main-windows
		//$('.main-window').addClass('nodisplay');
		//$(this.el).removeClass('nodisplay');

		return this;
	}
});


App.Views.ThreadMobile = Backbone.View.extend({
	
	el: '#thread',

	thread_id: 0,

	events: {
		//'click .thread-preview': 'thread_preview'
		//'swipeleftup' : 'back_to_inbox', // back to inbox
		//'swipeleftdown' : 'back_to_inbox', // back to inbox (should not run twice!)
		//'swipetwo' : 'back_to_inbox', // doesn't work (back to inbox)
		//'swipethree' : 'back_to_inbox', // doesn't work (should go to Accounts)
		'click .thread-view .email .details .addresses' : 'minimize',
		'click .thread-view .actions .btn[btn-action="back"]' : 'back',
		'click .thread-view .email .options .reply' : 'quick_reply',
		'click .thread-view .email .options .info' : 'info',
		'click .thread-view .email .ParsedDataShowAll span' : 'email_folding',

		// Tabs
		'click #threadTabs a.isTab' : 'change_tab',
		'click #threadTabs a#back' : 'back_to_inbox'
	},

	initialize: function() {
		this.$el.unbind(); // Unbind everything, fuck
		_.bindAll(this, 'render');
	},


	back_to_inbox: function(ev){
		
		// Unload this
		$(this.el).addClass('nodisplay');
		$('#threads').removeClass('nodisplay');

		// Reload the previous screen
		App.router.navigate('', true);

	},


	change_tab: function(ev){
		// Change the tab

		var elem = ev. currentTarget;

		// Show the correct href
		$(this.el).find('.tab-pane').removeClass('active');
		$(this.el).find($(elem).attr('href')).addClass('active');

		// Change my styling
		$(elem).siblings().removeClass('active');
		$(elem).addClass('active');

		return false;

	},


	minimize: function(ev){
		
		// Get elem
		var elem = ev.currentTarget;
		var $email = $(elem).parents('.email');
		// Open or close?
		if($email.attr('data-open-state') == 'open'){
			// Close it
			$email.attr('data-open-state','closed');
		} else {
			// Open it
			$email.attr('data-open-state','open');
		}

	},


	back: function (ev){

		// Back to Inbox
		// - or go back to search results?

		// Should open the Inbox or Search page, which, if empty, reloads (or just displays the previous data)
		// - searches that are changed (removed a value or a key) should auto-update?

		App.router.navigate("inbox", true);

	},


	info: function (ev){
		
		// Toggle displaying the Headers for the message
		var elem = ev.currentTarget;

		var info_holder = $(elem).parents('.email').find('.info_holder');

		if($(info_holder).hasClass('nodisplay')){
			$(info_holder).removeClass('nodisplay')
		} else {
			$(info_holder).addClass('nodisplay')
		}


	},


	email_folding: function (ev){
		// Display any hidden emails (previous parts of the conversation)

		var elem = ev.currentTarget;

		var content_holder = $(elem).parents('.content');
		//var count = $(content_holder).find('.ParsedDataContent').length;

		// Toggle
		if($(content_holder).hasClass('showAllParsedData')){
			$(content_holder).removeClass('showAllParsedData')
			
			$(content_holder).find('.ParsedDataContent:not([data-level="0"])').slideUp('fast');

			$(elem).text('...');
		} else {
			$(content_holder).addClass('showAllParsedData')

			$(content_holder).find('.ParsedDataContent:not([data-level="0"])').slideDown('fast');

			$(elem).text('Hide');
		}


	},


	quick_reply: function(ev){
		// Quick Reply to a message
		// - no Subject, etc. Just simple options

		var elem = ev.currentTarget;
		var $email_elem = $(elem).parents('.email');

		// Add ComposeQuick above the email (slide in)
		// - if already out, hide

		//if($(elem).parents('.email')

		// Email.id

		var query = 
		{
			"model" : "Email",
			"paths" : [""], // Whole Entity
			"conditions" : {
				"id" : $email_elem.attr('data-id')
			},
			"limit" : 100,
			"offset" : 0 // Pagination
		};

		Api.search({
			data: query,
			success: function(response){

				try {
					var json = $.parseJSON(response);
				} catch (err){
					alert("Failed parsing JSON");
					return;
				}

				// Check the validity
				if(json.code != 200){
					// Expecting a 200 code returned
					console.log('200 not returned');
					return;
				}

				// Get the Email data
				json.data = json.data[0];
				var page = new App.Views.EmailComposeQuick({
					$email_elem: $email_elem,
					email: json.data
				});
				page.render();

			}
		});
		
	},


	render: function() {
		var that = this;

		// Data
		var data = this.options.thread;

		this.thread_id = this.options.thread.Thread._id

		// Template
		var template = App.Utils.template('t_thread_view_mobile');

		// Shrink/minimize the threads that are not the latest (don't want to have to keep scrolling down)
		// - todo (v2)

		// Write HTML
		$(this.el).html(template(data));

		// Hide other main-windows
		$('.page').addClass('nodisplay');
		$(this.el).removeClass('nodisplay');

		// Swiping
		$('body').swipe('destroy');
		$('body').swipe({
			swipeLeft:function(event, direction, distance, duration, fingerCount) {
				that.back_to_inbox();
			}
		});

		return this;
	}
});


App.Views.ThreadDetails = Backbone.View.extend({
	
	//className: 'inbox',
	el: '#threadOverview',

	thread_id: '',
	notes_exist: 1,

	events: {
		//'click .thread-preview': 'thread_preview'
		//'click .thread-view .email .details .addresses' : 'minimize',

		'click .thread-overview .remove-label' : 'remove_label',
		'click .thread-overview .add-label' : 'open_add_label',
		'click .thread-overview .labels button' : 'add_label'

	},

	initialize: function() {
		this.$el.unbind(); // Unbind everything, fuck
		_.bindAll(this, 'render');
	},

	beforeClose: function(){
		//this.$el.unbind(); // Unbind
		clearInterval(this.notes_interval);
	},


	notes_updater: function(){

		var that = this;

		var Thread = this.options.thread.Thread;
		that.prev_notes = (Thread.attributes.notes == undefined ? "" : Thread.attributes.notes);

		this.notes_interval = setInterval(function(){
			// See if we need to save anything

			var new_notes = that.$el.find('#NoteText').val();

			if(new_notes != that.prev_notes){
				that.prev_notes = new_notes;

				// Send update command
				// - use Ajax manager

				that.$el.find('.notes').addClass('saving');

				// Make query to update Thread
				Api.update({
					data: {
						model: 'Thread',
						id: that.thread_id,
						paths: {
							"attributes.notes": that.prev_notes
						}
					},
					success: function(response){
						that.$el.find('.notes').removeClass('saving');
						console.log('Finished updating');
						//console.log(response);
					}
				});


			}

			//clearInterval(tmp_interval);

		},2000);

	},


	remove_label: function(ev){
		
		var elem = ev.currentTarget;

		var label = "attributes.labels." + $(elem).parents('.label').attr('data-label');

		var thread_id = $(elem).parents('.thread-overview').attr('data-thread-hash');

		var data = {
				model: 'Thread',
				id: thread_id,
				paths: {}
			};

		// Roundabout way of doing label addition, doesn't work with label:0 above
		data.paths[label] = 0;

		// Api/update
		Api.update({
			data: data,
			success: function(response){

			}
		});

		// Remove element
		$(elem).parents('.label').remove();

	},


	open_add_label: function(ev){
		// Prompt for a new label

		// Give a list of "common" labels

		var elem = ev.currentTarget;

		// Remove nodisplay
		var $labels = $(elem).parents('.labels');

		// Show hidden input
		$labels.find('.adding').removeClass('nodisplay');

		// Focus on input field
		$labels.find('#AddLabels').focus();

		// Remove "+add" button
		$(elem).addClass('nodisplay');

	},


	add_label: function(ev){
		// Actually add the label

		var elem = ev.currentTarget;

		// Label already exists?
		// - not empty?
		var $input = $(elem).parent().find('#AddLabels');

		// Split on spaces (multiple)
		var $val = $input.val();
		if($val.length <= 0){
			// Hide/show
			this.back_to_hidden_label();
			return;
		}

		var tmp_labels = $val.split('.');

		if(tmp_labels.length <= 0){
			// Hide/show
			this.back_to_hidden_label();
			return;
		}

		var labels = [];
		$.each(tmp_labels,function(i,label){
			// Sanitize

			// Remove dots
			label = label.replace(/\./g, "");

			// Remove whitespace
			label = $.trim(label);

			// Empty?
			if(label.length < 1){
				return;
			}

			// Add to array
			labels.push(label);
		});

		// Unique array
		labels = _.uniq(labels);

		// Empty?
		if(labels.length < 1){
			return;
		}

		var thread_id = $(elem).parents('.thread-overview').attr('data-thread-hash');

		var data = {
				model: 'Thread',
				id: thread_id,
				paths: {}
			};

		// Roundabout way of doing label addition, doesn't work with label:0 above
		$.each(labels,function(i,label){
			data.paths['attributes.labels.' + label] = 1;
		});

		// Api/update
		Api.update({
			data: data,
			success: function(response){

			}
		});

		// Add element
		$.each(labels,function(i,label){

			// Template
			var template = App.Utils.template('t_thread_overview_label');
			var key_data = {key: label};

			$(elem).parents('.labels').find('.add-label').before(template(key_data));
		});

		// Hide/show
		this.back_to_hidden_label();

	},


	back_to_hidden_label: function(){

		// Clear
		$(this.el).find('.labels #AddLabels').val('');

		// Hide input box
		$(this.el).find('.labels .adding').addClass('nodisplay');

		// Show "+add" button
		$(this.el).find('.labels .add-label').removeClass('nodisplay');

	},


	render: function() {

		// Data
		var data = this.options.thread;

		this.thread_id = this.options.thread.Thread._id

		// Build the data
		// - collect all file attachments, extract data
		// - get Thumbnails (if we have them)
		var files = [];
		var extracted_anything = false;
		var extracted = {};
		$.each(data.Email,function(i,email){

			// Attachments (Files)
			// Received
			if(email.original.attachments){
				$.each(email.original.attachments,function(i,attachment){
					var tmp = {
						url: attachment.path,
						name: attachment.name
					};
					files.push(tmp);
				});
			}
			// Sent
			if(email.original.Attachments){
				$.each(email.original.Attachments,function(i,attachment){
					var tmp = {
						url: attachment.path,
						name: attachment.name
					};
					files.push(tmp);
				});
			}

			// Extracted data
			// Received
			var phones = App.Utils.extract.PhoneNumber([email.original.TextBody,email.original.HtmlBody]);
			if(phones && phones.length > 0){
				if(typeof extracted['phones'] !== 'object'){
					extracted['phones'] = [];
				}
				$.each(phones,function(i,ptn){
					extracted['phones'].push(ptn);
				});
			}
			var shipping = App.Utils.extract.Shipping([email.original.TextBody,email.original.HtmlBody]);
			if(shipping && shipping.length > 0){
				if(typeof extracted['shipping'] !== 'object'){
					extracted['shipping'] = [];
				}
				$.each(shipping,function(i,details){
					extracted['shipping'].push(details);
				});
			}

			// Sent
			/*
			if(email.original.Attachments){
				$.each(email.original.Attachments,function(i,attachment){
					var tmp = {
						url: attachment.path,
						name: attachment.name
					};
					files.push(tmp);
				});
			}
			*/

		});

		data.Files = files;
		data.Extracted = extracted;

		// Template
		var template = App.Utils.template('t_thread_overview');

		// Shrink/minimize the threads that are not the latest (don't want to have to keep scrolling down)
		// - todo (v2)

		// Write HTML
		$(this.el).html(template(data));

		// Turn on updater
		this.notes_updater();

		// Turn on auto-grow
		$('.autogrow').autogrow();

		// Full Contact API
		// - should be updating when we click on a different email address
		// - or it should be stored in Contacts?
		// - should be a separate View?
		var emailAddresses = [];
		$.each(data.Email,function(i,tmp_email){
			var tmp_headers = tmp_email.original.headers;
			if(typeof tmp_headers.To == "object" && typeof tmp_headers.To[1] == "string"){
				emailAddresses.push(tmp_headers.To[1]);
			}
			if(typeof tmp_headers.From == "object" && typeof tmp_headers.From[1] == "string"){
				emailAddresses.push(tmp_headers.From[1]);
			}
			if(typeof tmp_headers['Reply-To'] == "object" && typeof tmp_headers['Reply-To'][1] == "string"){
				emailAddresses.push(tmp_headers['Reply-To'][1]);
			}
		});
		
		var allAddresses = [];
		$.each(emailAddresses,function(i,emailAddress){

			if($.inArray(emailAddress, App.Data.accounts)){
				console.log('Me');
				return false;
			}

			$.fullcontact.emailLookup(
				App.Credentials.fullcontact_api_key,
				emailAddress,
				function(obj){
					//window.console.log(obj);

					// populate that bitch
					if(obj.status != 200 || typeof obj.contactInfo == 'undefined'){
						window.console.log('Failed with FullContact API');
						window.console.log(obj);
						return false;
					}
					console.log(obj);

					// Template
					var template = App.Utils.template('t_thread_overview_contact_info');

					// Write HTML
					$('#contact_info > i').remove();
					$('#contact_info').append(template(obj));				
					
				}
			);
		});
		
		/*
		var nobj = '{"status":200,"photos":[{"typeName":"Vimeo","type":"vimeo","typeId":"vimeo","url":"http://a.vimeocdn.com/images_v6/portraits/portrait_30_yellow.png"},{"typeName":"Vimeo","type":"vimeo","typeId":"vimeo","url":"http://a.vimeocdn.com/images_v6/portraits/portrait_75_yellow.png"},{"typeName":"Vimeo","type":"vimeo","typeId":"vimeo","url":"http://a.vimeocdn.com/images_v6/portraits/portrait_100_yellow.png"},{"typeName":"Vimeo","type":"vimeo","typeId":"vimeo","url":"http://a.vimeocdn.com/images_v6/portraits/portrait_300_yellow.png"},{"typeName":"Twitter","type":"twitter","typeId":"twitter","url":"http://a0.twimg.com/profile_images/1278788152/P1010047_normal.JPG"},{"url":"http://profile.ak.fbcdn.net/hprofile-ak-snc4/186836_540928962_2990813_q.jpg","type":"facebook","typeId":"facebook","typeName":"Facebook","isPrimary":true},{"url":"http://graph.facebook.com/540928962/picture?type=large","type":"facebook","typeId":"facebook","typeName":"Facebook"},{"url":"http://qph.cf.quoracdn.net/main-thumb-3906482-50-9cPRflN4VRPrKsYkpAXM8s1aGEOc6FBY.jpeg","type":"quora","typeId":"quora","typeName":"Quora"},{"url":"http://profile.ak.fbcdn.net/hprofile-ak-snc4/174479_540928962_3632789_n.jpg","type":"facebook","typeId":"facebook","typeName":"Facebook"},{"typeName":"Facebook","type":"facebook","typeId":"facebook","url":"http://graph.facebook.com/nicholas.a.reed/picture?type=large"}],"contactInfo":{"familyName":"Reed","fullName":"Nicholas Reed","givenName":"Nicholas"},"demographics":{"locationGeneral":"ÜT: 33.647665,-112.384939","gender":"male"},"socialProfiles":[{"id":"7792049","typeName":"Vimeo","username":"user7792049","bio":"","type":"vimeo","typeId":"vimeo","url":"http://vimeo.com/user7792049"},{"id":55179444,"typeName":"Twitter","following":80,"followers":74,"username":"nicholas_a_reed","type":"twitter","typeId":"twitter","url":"http://www.twitter.com/nicholas_a_reed","rss":"http://twitter.com/statuses/user_timeline/nicholas_a_reed.rss"},{"url":"http://www.facebook.com/nicholasareed","id":"540928962","type":"facebook","username":"nicholasareed","typeId":"facebook","typeName":"Facebook"},{"type":"klout","typeId":"klout","typeName":"Klout","url":"http://www.klout.com/nicholas_a_reed","username":"nicholas_a_reed"},{"typeName":"Gravatar","id":"36432684","username":"nicholasareed","type":"gravatar","typeId":"gravatar","url":"http://gravatar.com/nicholasareed"},{"url":"http://www.quora.com/nicholas-reed","type":"quora","username":"nicholas-reed","typeId":"quora","typeName":"Quora"},{"url":"http://plancast.com/user/1658787","id":"1658787","type":"plancast","typeId":"plancast","typeName":"Plancast"},{"typeName":"Flickr","id":"67809778@N06","username":"nicholasareed","type":"flickr","typeId":"flickr","url":"http://www.flickr.com/people/67809778@N06/"}],"digitalFootprint":{"topics":[{"value":"User Experience Design","provider":"klout"},{"value":"MTV","provider":"klout"},{"value":"Cars","provider":"klout"},{"value":"OAuth","provider":"klout"},{"value":"Apps","provider":"klout"}],"scores":[{"value":22.3,"provider":"klout","type":"general"},{"value":5.14,"provider":"klout","type":"network"},{"value":51,"provider":"klout","type":"reach"},{"value":4,"provider":"klout","type":"amplification"}]}}';
		nobj = JSON.parse(nobj);
		console.log(nobj);

		// Template
		var template2 = App.Utils.template('t_thread_overview_contact_info');

		// Write HTML
		$('#contact_info').html(template2(nobj));
		*/			

		return this;
	}
});


App.Views.EmailMultipleSelected = Backbone.View.extend({
	
	//className: 'inbox',
	el: '.pane-messages div.pane-content',

	events: {
		//'click .thread-preview': 'thread_preview'
		'click .thread-view .actions .btn[btn-action="archive"]' : 'archive'
	},

	initialize: function() {
		_.bindAll(this, 'render');
	},


	archive: function (ev){

		// Back to Inbox
		// - or go back to search results?

		// Path to change

		// Build Query
		// - moving out of inbox
		var q = {
			"model" : "Thread",
			"id" : "",
			"paths" : {
				"attributes.labels.inbox" : 0
			}
		};

		alert('not working yet');

		// Make ajax request
		Api.search({

		});

	},


	render: function() {

		// Data (Threads with associated Emails)
		var data = this.options.emails;
		console.log(data);
		// Template
		var template = App.Utils.template('t_emails_multiple_selected');

		// Shrink/minimize the threads that are not the latest (don't want to have to keep scrolling down)
		// - todo (v2)

		// Write HTML
		$(this.el).html(template(data));

		return this;
	}
});


App.Views.EmailCompose = Backbone.View.extend({
	
	//className: 'inbox',
	el: '.pane-messages div.pane-content',

	thread_id: '',

	events: {
		//'click .thread-preview': 'thread_preview'
		'click #send' : 'send',
		'submit form#EmailCompose' : 'cancel_form',
		'click #cancel' : 'cancel',
		'click #attachment_add' : 'attachment_add',
		'click .attachment_data i' : 'attachment_remove'
	},

	initialize: function() {
		this.$el.unbind(); // Unbind everything, fuck
		_.bindAll(this, 'render');
	},

	attachment_add: function(ev){
		// Use Filepicker.io to add an attachment, get the URL back
		var elem = ev.currentTarget;

		filepicker.setKey(App.Credentials.filepicker_api_key);
		filepicker.getFile('*/*', {'multiple': true, 'modal': true}, function(response){
			// Add the url to the page, under attachments

			$.each(response,function(i,data){
				// Add a random hash for the URL

				var url = data.url;
				var filename = data.data.filename;

				var hash = App.Utils.base64.encode(url);

				// Build HTML to insert (should use a template here)
				var html = '<div class="attachment_data" data-url="'+url+'" data-filename="'+filename+'"><span class="attachment"><i class="icon-remove"></i> '+filename+'</span>';
				html += '<input type="hidden" class="url" name="Email.Attachments['+hash+'].url" value="'+url+'" />';
				html += '<input type="hidden" name="Email.Attachments['+hash+'].filename" value="'+filename+'" />';
				html += '</div>';
				$('.attachments_list').append(html);
			});

		});

		return false;

	},

	attachment_remove: function(ev){
		// Remove an attachment we grabbed before
		var elem = ev.currentTarget;

		$(elem).parents('div.attachment_data').remove();

	},

	validationOptions: {
		
		onsubmit: false,
		onfocusout: false,
		submitHandler: null
	
	},

	cancel_form: function(){
		return false;
	},

	send: function(ev){
		// Send an email (start the process)

		// Run pre-submit checks
		// - blocking, use deferreds here


		// For example: 
		// - encrypt my message with my private key and the other person's public key, add the mime-type that defines it as PGP Encrypted
		// - popup a box that they are missing an attachment when they wrote "attached" in the email body

		// - the plugins register against an event that this function will send out
		//		- this Plugin broadcasts that people can listen on the channel, and register functions we will call before handling the form


		// Run default Form validation based on css classes (I like that approach, but might want to switch to a different attr, like validate="required email")
		if(!this.form.form()){
			// Validation failed
			return false;
		}

		// Form was valid
		// - send to server using Api.event();

		// Gather the POST information

		// Get the Draft._id (v2 includes Drafts)
		
		// Defaults
		var emailDefaults = {
			From 			: from = this.$el.find('#EmailFrom').val(),
			//FromName 		: 'Nicholas Reed', // hardcoded, remove this
			//SenderAddress 	: from,
			To 				: this.$el.find('#EmailTo').val(),
			//ReplyToAddress 	: from,
			//CcAddress 		: '',
			//BccAddress 		: '',
			Subject 		: this.$el.find('#EmailSubject').val(),
			//HtmlBody 		: '',
			TextBody 			: this.$el.find('#EmailTextBody').val(),

			Headers			: []
		};

		// Get serialized Form submission
		// - turns it into an object that we can use
		emailFormData = form2js('EmailCompose');

		// Merge default email data and form data
		var emailData = $.extend(emailDefaults,emailFormData.Email);

		// Validation already occurred, default values were overwritten



		// Testing process after send

		// Replace compose with "Sending..."


		this.$el.find('form').addClass('nodisplay');

		// Sending text
		// - should be a View also, handle canceling, failed messages, etc? 
		this.$el.append('<div id="sending_text" style="font-weight: bold;text-align:center;">Sending...</div>');

		// Start listening for the events on the channel for this Email
		// - expected events: Email.[sent|failed]

		// Listening
		var draft_event_id = Api.Event.on({
			event: ['Email.sent','Email.failed_sending']
			//id: // Need result from above Api.write data! Or, we might already have it if we pre-save earlier

		},function(data){
			// Turn off listening
			console.log('FOUND event');
			Api.Event.off(draft_event_id);

			// See what the event was
			if(data.event == 'Email.sent'){
				// Sent well
				// - replace "Sending" with "Sent"

				// What is "this" now equal to?
				$('#sending_text').text('Sent');

				// Update the Thread with the new information
				// - todo...
				return;

			} else if(data.event == 'Email.failed_sending'){
				// Bad(ish)
				// - re-open the message and try sending again

				// todo...
				console.log('Miserably failed sending the Email');
				return;

			} else {
				// Something bad, didn't match conditions
				console.log('Massive Fail in event triggering');
				return;
			}

		});

		// Send request to server
		// - api/write
		Api.write({
			data: {
				model: 'Email',
				event: 'Email.send',
				obj: {
					original: emailData,
					attributes: {
						type: 'draft' // gets changed to sent
					},
					common: {
					}
				}
			},
			success: function(response){
				console.log('Received Write back');
				console.log(response);
			}
		});




		// Subscribe to Firebase event that is fired from server-side when email has been sent
		// - (undo) -> v2 todo
		// - push email to beanstalk queue that we can cancel on


		// Wait for Clientside event to say that the message has been Sent

		return false;

		/*
		{
			"FromAddress" : "from@example.com",
			"FromName" : "Sam Jones",
			"SenderAddress" : "sender@example.com",
			"ToAddress": "receiver1@example.com, receiver2@example.com",
			"ReplyToAddress": "replyto@example.com",
			"CcAddress": "receiver3@example.com, receiver4@example.com",
			"BccAddress": "receiver4@example.com, receiver5@example.com",
			"Subject" : "Test",
			"HtmlBody" : "Hello",
			"TextBody" : "Hello",
			"Headers" : 	[{"Name" : "CUSTOM-HEADER-1", "Value" : "Header Value"},
					 {"Name" : "CUSTOM-HEADER-2", "Value" : "Header Value"}]
			"Attachments" : [{"Filename" : "File1.txt", "Content" : "SG93ZHkh"},
					 {"Filename" : "File2.txt", "Content" : "SGV5IEhleSEh"}]
		}
		*/

	},

	save_now: function(){
		// Save the message as a Draft
		// auto-save anyways

		var elem = ev.currentTarget;

	},

	cancel: function(){
		// Cancel sending an email (discards Draft, if it exists: changes attributes.live=0)


		var elem = ev.currentTarget;

	},

	render: function() {

		// Template
		var template = App.Utils.template('t_email_compose');

		// Shrink/minimize the threads that are not the latest (don't want to have to keep scrolling down)
		// - todo (v2)

		// Write HTML (no data)
		$(this.el).html(template());

		// Load validation plugin
		this.form = $("form#EmailCompose").validate(this.validationOptions);

		// Hide other main-windows
		$('.main-window').addClass('nodisplay');
		$(this.el).removeClass('nodisplay');

		return this;
	}
});


App.Views.EmailComposeQuick = Backbone.View.extend({
	
	//className: 'inbox',
	el: '.emails',

	events: {
		//'click .thread-preview': 'thread_preview'
		'click #send' : 'send',
		'submit form#EmailComposeQuick' : 'cancel_form',
		'click #cancel' : 'cancel',
		'click #attachment_add' : 'attachment_add',
		'click .attachment_data i' : 'attachment_remove'
	},

	initialize: function() {
		_.bindAll(this, 'render');
	},

	attachment_add: function(ev){
		// Use Filepicker.io to add an attachment, get the URL back
		var elem = ev.currentTarget;

		filepicker.setKey('fn81eXsQQXu-GVoQxtDl');
		filepicker.getFile('*/*', {'multiple': true, 'modal': true}, function(response){
			// Add the url to the page, under attachments

			$.each(response,function(i,data){
				// Add a random hash for the URL

				var url = data.url;
				var filename = data.data.filename;

				var hash = App.Utils.base64.encode(url);

				// Build HTML to insert (should use a template here)
				var html = '<div class="attachment_data" data-url="'+url+'" data-filename="'+filename+'"><span class="attachment"><i class="icon-remove"></i> '+filename+'</span>';
				html += '<input type="hidden" class="url" name="Email.Attachments['+hash+'].url" value="'+url+'" />';
				html += '<input type="hidden" name="Email.Attachments['+hash+'].filename" value="'+filename+'" />';
				html += '</div>';
				$('.attachments_list').append(html);
			});

		});

		return false;

	},

	attachment_remove: function(ev){
		// Remove an attachment we grabbed before
		var elem = ev.currentTarget;

		$(elem).parents('div.attachment_data').remove();

	},

	validationOptions: {
		
		onsubmit: false,
		onfocusout: false,
		submitHandler: null
	
	},

	cancel_form: function(){
		return false;
	},

	send: function(ev){
		// Send an email (start the process)
		var elem = ev.currentTarget;

		// Run pre-submit checks
		// - blocking, use deferreds here


		// For example: 
		// - encrypt my message with my private key and the other person's public key, add the mime-type that defines it as PGP Encrypted
		// - popup a box that they are missing an attachment when they wrote "attached" in the email body

		// - the plugins register against an event that this function will send out
		//		- this Plugin broadcasts that people can listen on the channel, and register functions we will call before handling the form


		// Run default Form validation based on css classes (I like that approach, but might want to switch to a different attr, like validate="required email")
		if(!this.form.form()){
			// Validation failed
			return false;
		}

		// Form was valid
		// - send to server using Api.event();

		// Gather the POST information

		// Get the Draft._id (v2 includes Drafts)
		
		// Defaults
		var emailDefaults = {
			From 			: from = this.$el.find('#EmailFrom').val(),
			//FromName 		: 'Nicholas Reed', // hardcoded, remove this
			//SenderAddress 	: from,
			To 				: this.$el.find('#EmailTo').val(),
			//ReplyToAddress 	: from,
			//CcAddress 		: '',
			//BccAddress 		: '',
			Subject 		: this.$el.find('#EmailSubject').val(),
			//HtmlBody 		: '',
			TextBody 		: this.$el.find('#EmailText').val(),

			headers			: []
		};

		// Get serialized Form submission
		// - turns it into an object that we can use
		emailFormData = form2js('EmailComposeQuick');

		// Merge default email data and form data
		var emailData = $.extend(emailDefaults,emailFormData.Email);

		// Validation already occurred, default values were overwritten



		// Testing process after send

		// Replace compose with "Sending..."


		this.$el.find('form').addClass('nodisplay');

		// Sending text
		// - should be a View also, handle canceling, failed messages, etc? 
		this.$el.append('<div id="sending_text" style="font-weight: bold;text-align:center;">Sending...</div>');


		// Start listening for the events on the channel for this Email
		// - expected events: Email.[sent|failed]

		// Listening
		var draft_event_id = Api.Event.on({
			event: ['Email.sent','Email.failed_sending']
			//id: // Need result from above Api.write data! Or, we might already have it if we pre-save earlier

		},function(data){
			// Turn off listening
			console.log('FOUND event');
			Api.Event.off(draft_event_id);

			// See what the event was
			if(data.event == 'Email.sent'){
				// Sent well
				// - replace "Sending" with "Sent"

				// What is "this" now equal to?
				$('#sending_text').text('Sent');

				// Update the Thread with the new information
				// - todo...
				return;

			} else if(data.event == 'Email.failed_sending'){
				// Bad(ish)
				// - re-open the message and try sending again

				// todo...
				console.log('Miserably failed sending the Email');
				return;

			} else {
				// Something bad, didn't match conditions
				console.log('Massive Fail in event triggering');
				return;
			}

		});

		// Send request to server
		// - api/write
		Api.write({
			data: {
				model: 'Email',
				event: 'Email.send',
				obj: {
					original: emailData,
					attributes: {
						type: 'draft', // gets changed to sent
						thread_id: $(elem).parents('.thread-view').attr('data-thread-hash')
					},
					common: {
					}
				}
			},
			success: function(response){
				console.log('Received Write back');
				console.log(response);
			}
		});



		// Subscribe to Firebase event that is fired from server-side when email has been sent
		// - (undo) -> v2 todo
		// - push email to beanstalk queue that we can cancel on


		// Wait for Clientside event to say that the message has been Sent

		return false;

		/*
		{
			"FromAddress" : "from@example.com",
			"FromName" : "Sam Jones",
			"SenderAddress" : "sender@example.com",
			"ToAddress": "receiver1@example.com, receiver2@example.com",
			"ReplyToAddress": "replyto@example.com",
			"CcAddress": "receiver3@example.com, receiver4@example.com",
			"BccAddress": "receiver4@example.com, receiver5@example.com",
			"Subject" : "Test",
			"HtmlBody" : "Hello",
			"TextBody" : "Hello",
			"Headers" : 	[{"Name" : "CUSTOM-HEADER-1", "Value" : "Header Value"},
					 {"Name" : "CUSTOM-HEADER-2", "Value" : "Header Value"}]
			"Attachments" : [{"Filename" : "File1.txt", "Content" : "SG93ZHkh"},
					 {"Filename" : "File2.txt", "Content" : "SGV5IEhleSEh"}]
		}
		*/

	},

	save_now: function(ev){
		// Save the message as a Draft
		// auto-save anyways

		var elem = ev.currentTarget;

	},

	cancel: function(ev){
		// Cancel sending an email (discards Draft, if it exists: changes attributes.live=0)


		var elem = ev.currentTarget;

	},

	render: function() {

		// Template
		var template = App.Utils.template('t_email_compose_quick');

		// Shrink/minimize the threads that are not the latest (don't want to have to keep scrolling down)
		// - todo (v2)

		var data = this.options.email.Email;

		// Remove any old reply boxes?
		// - simply don't do anything if it gets clicked?
		$('.EmailComposeQuick_holder').remove();

		// Write HTML (no data)
		this.options.$email_elem.before(template(data));

		// Add added element to this view
		this.el.html = $(this.el).find('.EmailComposeQuick_holder').html();
		this.$el = $(this.el).find('.EmailComposeQuick_holder');

		// Display the hidden mofucka
		this.$el.removeClass('nodisplay').unfold();

		// Load validation plugin
		this.form = this.$el.find("form#EmailComposeQuick").validate(this.validationOptions);

		// Turn on auto-grow
		//$('.autogrow').autogrow();

		return this;
	}
});


App.Views.ContactBook = Backbone.View.extend({
	
	el: '#contacts-window .pane-contacts',

	events: {
		'click .contact .name': 'contact_view',
		'click .contact .name .contact_explore': 'contact_explore',

		'click .contact .objects': 'contact_view'

	},

	initialize: function() {
		_.bindAll(this, 'render');
	},

	contact_explore: function(ev){

		ev.preventDefault();

		var elem = ev.currentTarget;

		var contact_id = $(elem).parents('..contact').attr('data-contact-id');

		// Run search

		App.Utils.explore({
			'model' : 'Contact',
			'_id' : contact_id
		});

		return false;

	},

	contact_view: function(ev) {
		// Display the selected thread
		
		var elem = ev.currentTarget;
		
		// Get the Thread/Message
		// - using just Messages for now
		
		App.router.navigate("contact/" + $(elem).parent().attr('data-contact-id'), true);

	},

	render: function() {

		// Data
		var data = this.options.contacts;

		// Template
		var template = App.Utils.template('t_contacts_structure');
		
		// Write HTML
		
		$(this.el).html(template(data));
		
		// Hide other main-windows
		$('.main-window').addClass('nodisplay');
		$('#contacts-window').removeClass('nodisplay');

		return this;
	}
});


App.Views.ContactView = Backbone.View.extend({
	
	el: '.contact',

	events: {
		//'click .thread-preview': 'thread_preview'
	},

	initialize: function() {
		_.bindAll(this, 'render');
	},

	render: function() {

		// Data
		var data = this.options.contact;

		// Template
		var template = App.Utils.template('t_contact_view');

		// Write HTML
		$(this.el).html(template(data));

		// Hide other main-windows
		$('.main-window').addClass('nodisplay');
		$(this.el).removeClass('nodisplay');

		return this;
	}
});



