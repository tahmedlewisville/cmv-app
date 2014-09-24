define([
	'dojo/_base/declare',
	'dojo/_base/array',
	'dojo/_base/lang',
	'dojo/topic',
	'put-selector',
	'dijit/Menu',
	'dijit/layout/ContentPane',
	'gis/dijit/FloatingTitlePane',
	'gis/dijit/FloatingWidgetDialog'
], function (
	declare,
	array,
	lang,
	topic,
	put,
	Menu,
	ContentPane,
	FloatingTitlePane,
	FloatingWidgetDialog
) {
	return declare(null, {
		initWidgets: function () {
			var widgets = [],
				paneWidgets;

			for (var key in this.config.widgets) {
				if (this.config.widgets.hasOwnProperty(key)) {
					var widget = lang.clone(this.config.widgets[key]);
					if (widget.include) {
						widget.position = ('undefined' !== typeof (widget.position)) ? widget.position : 10000;
						widgets.push(widget);
					}
				}
			}
			for (var pane in this.panes) {
				if (this.panes.hasOwnProperty(pane) && (pane !== 'outer' || pane !== 'center')) {
					paneWidgets = array.filter(widgets, function (widget) {
						return (widget.placeAt && widget.placeAt === pane);
					});
					paneWidgets.sort(function (a, b) {
						return a.position - b.position;
					});
					array.forEach(paneWidgets, function (widget, i) {
						this.widgetLoader(widget, i);
					}, this);
				}
			}
			paneWidgets = array.filter(widgets, function (widget) {
				return !widget.placeAt;
			});
			paneWidgets.sort(function (a, b) {
				return a.position - b.position;
			});

			array.forEach(paneWidgets, function (widget, i) {
				this.widgetLoader(widget, i);
			}, this);

			// load a widget
			topic.subscribe('viewer/loadWidget', lang.hitch(this, function (args) {
				// In Widgets Mixin
				this.widgetLoader(args.options, args.position);
			}));

		},

		widgetLoader: function (widgetConfig, position) {
			var parentId, pnl;

			// only proceed for valid widget types
			var widgetTypes = ['titlePane', 'contentPane', 'floating', 'domNode', 'invisible', 'map'];
			if (array.indexOf(widgetTypes, widgetConfig.type) < 0) {
				this.handleError({
					source: 'Controller',
					error: 'Widget type "' + widgetConfig.type + '" (' + widgetConfig.title + ') at position ' + position + ' is not supported.'
				});
				return;
			}

			// build a titlePane, contentPane or floating widget as the parent
			if (widgetConfig.id && widgetConfig.id.length > 0) {
				parentId = widgetConfig.id + '_parent';

				if (widgetConfig.type === 'titlePane') {
					pnl = this._createTitlePaneWidget(parentId, widgetConfig.title, position, widgetConfig.open, widgetConfig.canFloat, widgetConfig.placeAt);
				} else if (widgetConfig.type === 'contentPane') {
					pnl = this._createContentPaneWidget(parentId, widgetConfig.title, widgetConfig.className, widgetConfig.region, widgetConfig.placeAt);
				} else if (widgetConfig.type === 'floating') {
					pnl = this._createFloatingWidget(parentId, widgetConfig.title);
				}
				if (pnl) {
					widgetConfig.parentWidget = pnl;
				}
			}

			// handle widgets in self-contained folder
			if (widgetConfig.path.substring(widgetConfig.path.length - 1) === '/') {
				widgetConfig.path += 'main';
			}

			// 2 ways to use require to accommodate widgets that may have an optional separate configuration file
			if (typeof (widgetConfig.options) === 'string') {
				require([widgetConfig.options, widgetConfig.path], lang.hitch(this, 'createWidget', widgetConfig));
			} else {
				require([widgetConfig.path], lang.hitch(this, 'createWidget', widgetConfig, widgetConfig.options));
			}
		},

		createWidget: function (widgetConfig, options, WidgetClass) {

			// set the options for the widget
			this.setWidgetOptions(widgetConfig, options);

			// create the widget
			var pnl = options.parentWidget;
			if ((widgetConfig.type === 'titlePane' || widgetConfig.type === 'contentPane' || widgetConfig.type === 'floating')) {
				this[widgetConfig.id] = new WidgetClass(options, put('div')).placeAt(pnl.containerNode);
			} else if (widgetConfig.type === 'domNode') {
				this[widgetConfig.id] = new WidgetClass(options, widgetConfig.srcNodeRef);
			} else {
				this[widgetConfig.id] = new WidgetClass(options);
			}

			// start up the widget
			if (this[widgetConfig.id] && this[widgetConfig.id].startup && !this[widgetConfig.id]._started) {
				this[widgetConfig.id].startup();
			}
		},

		setWidgetOptions: function (widgetConfig, options) {
			// set any additional options
			options.id = widgetConfig.id + '_widget';
			options.parentWidget = widgetConfig.parentWidget;

			//replace config map, layerInfos arrays, etc
			if (options.map) {
				options.map = this.map;
			}
			if (options.mapRightClickMenu) {
				this.createRightClickMenu();
				options.mapRightClickMenu = this.mapRightClickMenu;
			}
			if (options.mapClickMode) {
				options.mapClickMode = this.mapClickMode.current;
			}
			if (options.legendLayerInfos) {
				options.layerInfos = this.legendLayerInfos;
			} else if (options.tocLayerInfos) {
				options.layerInfos = this.tocLayerInfos;
			} else if (options.layerControlLayerInfos) {
				options.layerInfos = this.layerControlLayerInfos;
			} else if (options.editorLayerInfos) {
				options.layerInfos = this.editorLayerInfos;
			} else if (options.identifyLayerInfos) {
				options.layerInfos = this.identifyLayerInfos;
			}
		},

		createRightClickMenu: function () {
			if (!this.mapRightClickMenu) {
				this.mapRightClickMenu = new Menu({
					targetNodeIds: [this.map.root],
					selector: '.layersDiv' // restrict to map only
				});
				this.mapRightClickMenu.startup();
			}
		},

		_createTitlePaneWidget: function (parentId, title, position, open, canFloat, placeAt) {
			var tp, options = {
					title: title || 'Widget',
					open: open || false,
					canFloat: canFloat || false
				};
			if (parentId) {
				options.id = parentId;
			}
			if (typeof (placeAt) === 'string') {
				placeAt = this.panes[placeAt];
			}
			if (!placeAt) {
				placeAt = this.panes.left;
			}
			if (placeAt) {
				options.sidebar = placeAt;
				tp = new FloatingTitlePane(options).placeAt(placeAt, position);
				tp.startup();
			}
			return tp;
		},

		_createFloatingWidget: function (parentId, title) {
			var options = {
				title: title
			};
			if (parentId) {
				options.id = parentId;
			}
			var fw = new FloatingWidgetDialog(options);
			fw.startup();
			return fw;
		},

		_createContentPaneWidget: function (parentId, title, className, region, placeAt) {
			var cp, options = {
					title: title,
					region: region || 'center'
				};
			if (className) {
				options.className = className;
			}
			if (parentId) {
				options.id = parentId;
			}
			if (!placeAt) {
				placeAt = this.panes.sidebar;
			} else if (typeof (placeAt) === 'string') {
				placeAt = this.panes[placeAt];
			}
			if (placeAt) {
				cp = new ContentPane(options).placeAt(placeAt);
				cp.startup();
			}
			return cp;
		}
	});
});