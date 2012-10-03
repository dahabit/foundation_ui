// Simpler functions for plugins (like Models/components)

App.Plugins.Email = {

	view: {

		// Should be managing multiple inboxes with a single refresh, need to re-architect this
		// - only handles one inbox window at a time

		inbox_init: function(){

			App.Plugins.Email.view.inbox_refresh();

			// - should be tying this to a model instead of doing it here?
			var update_inbox_id = Api.Event.on({
				event: ['Email.sent','Email.new']
			},function(data){
				// Listening stays on
				//Api.Event.off(update_inbox_id);

				// Refresh the inbox
				App.Plugins.Email.view.inbox_refresh();

			});

		},

		inbox_refresh: function(){

			// Trigger the inbox update

			App.Plugins.Email.saved_searches.inbox()
			.then(function(response){
				// Succeeded (no errors)
				// - not doing any error handling, really
				
				// Send this data to Views.inbox
				var page = new App.Views.Inbox({
					threads: response.success
				});
				page.render();

			});
		},

		inbox_change: function(params){

			// Switching search parameters for the inbox

			App.Plugins.Email.saved_searches.inbox(params)
			.then(function(response){
				// Succeeded (no errors)
				// - not doing any error handling, really
				
				// Send this data to Views.inbox
				var page = new App.Views.Inbox({
					threads: response.success
				});
				page.render();

			});
		},

		mobile: {

			inbox_init: function(){

				App.Plugins.Email.view.mobile.inbox_refresh();

				// - should be tying this to a model instead of doing it here?
				var update_inbox_id = Api.Event.on({
					event: ['Email.sent_forget','Email.new_forget']
				},function(data){
					// Listening stays on
					//Api.Event.off(update_inbox_id);

					// Refresh the inbox
					App.Plugins.Email.view.mobile.inbox_refresh();

				});

			},

			inbox_refresh: function(){

				// Trigger the inbox update

				App.Plugins.Email.saved_searches.inbox()
				.then(function(response){
					// Succeeded (no errors)
					// - not doing any error handling, really
					
					// Send this data to Views.inbox
					var page = new App.Views.InboxMobile({
						threads: response.success
					});
					page.render();

				});
			}

		}

	},

	saved_searches: {

		last_inbox_params: null,
		inbox : function(params){

			// Start deferred (1st time use!)
			var dfd = $.Deferred();

			// Run Search query for inbox
			// - just get all messages for now
			var query = 
			{
				"model" : "Thread",
				"fields" : [], // Whole Entity
				"conditions" : {},
				"limit" : 50,
				"sort" : {"attributes.last_message_datetime" : -1}
			};

			var default_params = {
									"attributes.labels.Inbox" : 1
								};

			// No params included?
			// - use last, unless last is null, then use default
			if(typeof params == 'undefined'){
				if(App.Plugins.Email.saved_searches.last_inbox_params == null){
					inbox_params = default_params;
				} else {
					inbox_params = App.Plugins.Email.saved_searches.last_inbox_params;
				}
			} else {
				inbox_params = params;
			}

			query['conditions'] = inbox_params;

			// Update last params
			App.Plugins.Email.saved_searches.last_inbox_params = inbox_params;

			
			Api.search({
				data: query,
				success: function (response){
					
					try {
						var json = $.parseJSON(response);
					} catch (err){
						alert("Failed parsing JSON");
						return;
					}

					// Check the validity
					if(json.code != 200){
						// Expecting a 200 code returned
					}

					// Get Emails for the Threads
					// - no JOIN on server, yet

					var threads = [];
					var threads_obj = {};
					$.each(json.data,function(i,thread){
						threads.push(thread.Thread._id);
						//threads_obj[thread.id].thread = thread;
						threads_obj[thread.Thread._id] = {
								Thread: thread.Thread,
								Email: []
							};
					});


					var emails_query = 
					{
						"model" : "Email",
						"fields" : [
									// Common
									'common',
									'attributes',
									
									// Received
									'original',
									/*
									'original.subject',
									'original.sender',
									'original.stripped-text',
									'original.body-html',

									// Sent
									'original.To',
									'original.From',
									'original.Text'
									*/
									],
						"conditions" : {
							"attributes.thread_id" : {$in: threads},
						},
						"limit" : 300,
						"offset" : 0 // Pagination
					};

					Api.search({
						data: emails_query,
						success: function (response){
						
							try {
								var emails_json = $.parseJSON(response);
							} catch (err){
								alert("Failed parsing JSON");
								return;
							}

							// Check the validity
							if(emails_json.code != 200){
								// Expecting a 200 code returned
								console.log('Error, not 200. emails_query');
							}

							// Sort emails
							emails_json.data = App.Utils.sortBy(emails_json.data,'Email.common.date','asc','date');

							$.each(emails_json.data,function(i,email){
								// Add to the Thread object
								threads_obj[email.Email.attributes.thread_id].Email.push(email.Email);
							});

							//console.log('threads_obj');
							//console.log(threads_obj);

							threads_obj = App.Utils.sortBy(threads_obj,'Thread.attributes.last_message_datetime','asc','date');
							
							// Send search results to Views.Inbox
							dfd.resolve({
								success: threads_obj
							});

						}
					});

				}
			});

	
			// Return search function
			return dfd.promise();

		},

		thread: function(thread_id){
			// Return an individual Thread, including all Emails inside (received, sent, drafts, etc.)

			// Start deferred (1st time)
			var dfd = $.Deferred();

			// Individual thread
			var query = 
			{
				"model" : "Thread",
				"fields" : [], // Whole Entity
				"conditions" : {
					"_id" : thread_id
				},
				"limit" : 1
			};

			Api.search({
				data: query,
				success: function (response){
					
					try {
						var json = $.parseJSON(response);
					} catch (err){
						alert("Failed parsing JSON");
						return;
					}

					// Check the validity
					if(json.code != 200){
						// Expecting a 200 code returned
					}

					// One Thread returned?
					if(json.data.length != 1){
						// Shit
						console.log('Could not find Thread');
						return;
					}

					var thread = json.data[0].Thread;

					// Convert into a single Thread
					json.data = {
									Thread: thread,
									Email: []
								};

					// Get Emails
					// - sent, received, etc.
					var emails_query = 
					{
						"model" : "Email",
						"fields" : [
									// Common
									'attributes',
									'common',
									
									// Received
									'original',
									/*
									'original.subject',
									'original.sender',
									'original.recipient',
									'original.stripped-text',
									'original.body-html',
									'original.attachments',
									'original.message-headers',
						
									// Sent
									'original.To',
									'original.From',
									'original.Text',
									'original.Attachments',
									*/

									],
						"conditions" : {
							"attributes.thread_id" : thread._id
						},
						"limit" : 200
					};

					Api.search({
						data: emails_query,
						success: function (response){
						
							try {
								var emails_json = $.parseJSON(response);
							} catch (err){
								alert("Failed parsing JSON");
								return;
							}

							// Check the validity
							if(emails_json.code != 200){
								// Expecting a 200 code returned
								console.log('Error, not 200. emails_query');
							}

							// Sort Emails
							emails_json.data = App.Utils.sortBy(emails_json.data,'Email.common.date','asc','date');
							console.log(emails_json);

							// Add emails to Thread
							$.each(emails_json.data,function(i,email){
								// Add to the Thread object
								json.data.Email.push(email.Email);
							});

							dfd.resolve({
								success: json.data
							});

						}
					});

				}


			});
	
			// Return search function
			return dfd.promise();

		},


		accounts : function(){

			// Start deferred (1st time)
			var dfd = $.Deferred();

			// Run Search query for inbox
			// - just get all messages for now
			var query = 
			{
				"model" : "UserGmailAccounts",
				"limit" : 1
			};
			
			Api.search({
				data: query,
				success: function (response){
					
					try {
						var json = $.parseJSON(response);
					} catch (err){
						alert("Failed parsing JSON");
						return;
					}

					// Check the validity
					if(json.code != 200){
						// Expecting a 200 code returned

					}

					console.log(json.data);
					var accounts = json.data[0];

					// Send search results to Views.Body
					dfd.resolve({
						success: accounts
					});

				}
			});

	
			// Return search function
			return dfd.promise();

		}


	}
	
};


App.Plugins.Contact = {

	view: {

		init: function(){

			App.Plugins.Email.view.inbox_refresh();

			// - should be tying this to a model instead of doing it here?
			var update_inbox_id = Api.Event.on({
				event: ['Email.sent','Email.new']
			},function(data){
				// Listening stays on
				//Api.Event.off(update_inbox_id);

				// Refresh the inbox
				App.Plugins.Email.view.inbox_refresh();

			});

		},

		mobile: {

			init: function(){

				App.Plugins.Email.view.mobile.inbox_refresh();

				// - should be tying this to a model instead of doing it here?
				var update_inbox_id = Api.Event.on({
					event: ['Email.sent_forget','Email.new_forget']
				},function(data){
					// Listening stays on
					//Api.Event.off(update_inbox_id);

					// Refresh the inbox
					App.Plugins.Email.view.mobile.inbox_refresh();

				});

			}

		}

	},

	saved_searches: {

		contacts : function(params){

			// Start deferred (1st time use!)
			var dfd = $.Deferred();

			// Run Search query for inbox
			// - just get all messages for now
			var query = 
			{
				"model" : "Contact",
				"fields" : [], // Whole Entity
				"conditions" : {},
				"limit" : 25,
				"sort" : {"gmail.title.$t" : -1}
			};

			Api.search({
				data: query,
				success: function (response){
					
					try {
						var json = $.parseJSON(response);
					} catch (err){
						alert("Failed parsing JSON");
						return;
					}

					// Check the validity
					if(json.code != 200){
						// Expecting a 200 code returned
					}

					// Get Emails for the Threads
					// - no JOIN on server, yet

					// Send search results to Views.Inbox
					dfd.resolve({
						success: json.data
					});

					return false;


				}
			});

	
			// Return search function
			return dfd.promise();

		},

		contact: function(contact_id){
			// Return an individual Thread, including all Emails inside (received, sent, drafts, etc.)

			// Start deferred (1st time)
			var dfd = $.Deferred();

			// Individual thread
			var query = 
			{
				"model" : "Thread",
				"fields" : [], // Whole Entity
				"conditions" : {
					"_id" : contact_id
				},
				"limit" : 1
			};

			Api.search({
				data: query,
				success: function (response){
					
					try {
						var json = $.parseJSON(response);
					} catch (err){
						alert("Failed parsing JSON");
						return;
					}

					// Check the validity
					if(json.code != 200){
						// Expecting a 200 code returned
					}

					// One Thread returned?
					if(json.data.length != 1){
						// Shit
						console.log('Could not find Thread');
						return;
					}

					var thread = json.data[0].Thread;

					// Convert into a single Thread
					json.data = {
									Thread: thread,
									Email: []
								};

					// Get Emails
					// - sent, received, etc.
					var emails_query = 
					{
						"model" : "Email",
						"fields" : [
									// Common
									'attributes',
									'common',
									
									// Received
									'original',
									/*
									'original.subject',
									'original.sender',
									'original.recipient',
									'original.stripped-text',
									'original.body-html',
									'original.attachments',
									'original.message-headers',
						
									// Sent
									'original.To',
									'original.From',
									'original.Text',
									'original.Attachments',
									*/

									],
						"conditions" : {
							"attributes.thread_id" : thread._id
						},
						"limit" : 300,
						"offset" : 0 // Pagination
					};

					Api.search({
						data: emails_query,
						success: function (response){
						
							try {
								var emails_json = $.parseJSON(response);
							} catch (err){
								alert("Failed parsing JSON");
								return;
							}

							// Check the validity
							if(emails_json.code != 200){
								// Expecting a 200 code returned
								console.log('Error, not 200. emails_query');
							}

							// Sort Emails
							emails_json.data = App.Utils.sortBy(emails_json.data,'Email.common.date','asc','date');
							console.log(emails_json);

							// Add emails to Thread
							$.each(emails_json.data,function(i,email){
								// Add to the Thread object
								json.data.Email.push(email.Email);
							});

							dfd.resolve({
								success: json.data
							});

						}
					});

				}


			});
	
			// Return search function
			return dfd.promise();

		}


	}
	
};



App.Plugins.UI = {

	initialize: function(){
		// Initilize the plugin
		
		App.Plugins.UI.resizePanels();

		$(window).resize(function(){
			App.Plugins.UI.resizePanels();
		});

		// Autogrow
		$('body').on('focus','.autogrow:not(.growing)',function(){
			$(this).autogrow().addClass('growing');
			console.log('loaded autogrow');
		});

	},

	resizePanels: function(){
		// Resize the panes (inbox, messages, etc.)
		// - no scrolling down the page

		// Calc distance from top, height needed to fill the page
		var win_h = $(window).height();
		var from_top = $('.pane').offset().top;
		var new_h = win_h - from_top;

		//$('.pane').height(new_h + 'px')

		$('.pane').each(function(){

			$(this).slimScroll({
				height: new_h + 'px',
				size: '3px',
				wheelStep: 5,
				allowPageScroll: false,
				opacity: 0
			});

		});

		return;

		$('.pane').each(function(){

			// Already scrollable
			


			if($(this).find('> .slimScrollDiv').length >= 1){
				// Already has it
				$(this).find('> .slimScrollDiv').css('height',new_h + 'px');
				$(this).find('.pane-content').css('height',new_h + 'px');
			} else {
				// Add it
				$(this).find('.pane-content').slimScroll({
					height: new_h + 'px',
					size: '3px',
					wheelStep: 5,
					allowPageScroll: false,
					opacity: 0
				});
				console.log($(this).find('.pane-content'));
			}

			return;


			if($(this).find('> .slimScrollDiv').length >= 1){
				// Already has it
				// - remove it
				//$(this).find('.pane-content')
			}
			// Add it
			$(this).find('.pane-content').slimScroll({
				height: new_h + 'px',
				size: '3px',
				wheelStep: 5,
				allowPageScroll: false,
				opacity: 0
			});

		});

		// Trigger resize on the pane (in case anyone is listening on it)
		// - does this happen automatically?
		//$('.pane').trigger('resize');

	}

};