define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/has',
	'dojo/topic',
	'./mixins/Map',
	'./mixins/UI',
	'./mixins/Widgets',
	'esri/IdentityManager'
], function (declare, lang, has, topic, _MapMixin, _UIMixin, _WidgetsMixin) {

	var Controller = declare([_MapMixin, _UIMixin, _WidgetsMixin], {
		legendLayerInfos: [],
		editorLayerInfos: [],
		identifyLayerInfos: [],
		tocLayerInfos: [],
		layerControlLayerInfos: [],

		startup: function (config) {
			this.config = config;
			this.mapClickMode = {
				current: config.defaultMapClickMode,
				defaultMode: config.defaultMapClickMode
			};
			// simple feature detection. kinda like dojox/mobile without the overhead
			if (has('touch') && (has('ios') || has('android') || has('bb'))) {
				has.add('mobile', true);
				if (screen.availWidth < 500 || screen.availHeight < 500) {
					has.add('phone', true);
				} else {
					has.add('tablet', true);
				}
			}

			if (config.titles) {
				// In UI Mixin
				this.addTitles();
			}
			this.addTopics();

			// In UI Mixin
			this.initPanes();

			if (config.isDebug) {
				window.app = this; //dev only
			}
		},

		// add topics for subscribing and publishing
		addTopics: function () {
			// setup error handler. centralize the debugging
			if (this.config.isDebug) {
				topic.subscribe('viewer/handleError', lang.hitch(this, 'handleError'));
			}

			// set the current mapClickMode
			topic.subscribe('mapClickMode/setCurrent', lang.hitch(this, function (mode) {
				this.mapClickMode.current = mode;
				topic.publish('mapClickMode/currentSet', mode);
			}));

			// set the current mapClickMode to the default mode
			topic.subscribe('mapClickMode/setDefault', lang.hitch(this, function () {
				topic.publish('mapClickMode/setCurrent', this.mapClickMode.defaultMode);
			}));

		},

		//centralized error handler
		handleError: function (options) {
			if (this.config.isDebug) {
				if (typeof (console) === 'object') {
					for (var option in options) {
						if (options.hasOwnProperty(option)) {
							console.log(option, options[option]);
						}
					}
				}
			} else {
				// add growler here?
				return;
			}
		}

	});

	return new Controller();
});