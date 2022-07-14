///////////////////////////////////////////////////////////////////////////
// Popup Panel Widget - Author: Robert Scheitlin
///////////////////////////////////////////////////////////////////////////
/*global define*/
define([
    "dojo/_base/declare",
    "dijit/_WidgetsInTemplateMixin",
    "jimu/BaseWidget",
    "jimu/dijit/Message",
    "esri/domUtils",
    "esri/dijit/Popup",
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "esri/tasks/RelationshipQuery",

    "esri/layers/FeatureLayer",
    "esri/request",

    "dojo/on",
    "dojo/topic",
    "dojo/query",
    "dojo/_base/html",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/_base/lang",
    "jimu/WidgetManager",
    "jimu/PanelManager",
    "jimu/MapManager",
    "dojo/i18n!esri/nls/jsapi",
    "jimu/FeatureActionManager",
    "jimu/dijit/FeatureActionPopupMenu",
    "jimu/utils",
    "dojo/_base/array",
    "dijit/layout/ContentPane",
    "jimu/dijit/LoadingShelter",
    "dojo/dnd/Moveable",
    "dojo/store/Memory",
    "dijit/form/DateTextBox",
    "dijit/form/ComboBox",
    "dijit/form/ValidationTextBox",
], function (
    declare,
    _WidgetsInTemplateMixin,
    BaseWidget,
    Message,
    domUtils,
    Popup,
    Query,
    QueryTask,
    RelationshipQuery,
    FeatureLayer,
    esriRequest,
    on,
    topic,
    query,
    html,
    domClass,
    domConstruct,
    lang,
    WidgetManager,
    PanelManager,
    MapManager,
    esriBundle,
    FeatureActionManager,
    PopupMenu,
    jimuUtils,
    array,
    ContentPane,
    LoadingShelter,
    Moveable,
    Memory,
    DateTextBox,
    ComboBox,
    ValidationTextBox
) {
    return declare([BaseWidget, _WidgetsInTemplateMixin], {
        baseClass: "widget-popuppanel",
        name: "PopupPanel",
        label: "Popup Panel",
        popup: null,
        zt: null,
        clearSel: null,
        popupMenu: null,
        featureActionManager: null,
        inPanel: null,

        postCreate: function () {
            this.inherited(arguments);
            this.popupMenu = PopupMenu.getInstance();
            this.featureActionManager = FeatureActionManager.getInstance();
            domUtils.hide(this.actionsPaneDiv);
            this.own(
                on(
                    this.domNode,
                    "mousedown",
                    lang.hitch(this, function (event) {
                        event.stopPropagation();
                        if (event.altKey) {
                            var msgStr = this.nls.widgetverstr + ": " + this.manifest.version;
                            msgStr += "\n" + this.nls.wabversionmsg + ": " + this.manifest.wabVersion;
                            msgStr += "\n" + this.manifest.description;
                            new Message({
                                titleLabel: this.nls.widgetversion,
                                message: msgStr,
                            });
                        }
                    })
                )
            );

            this.popup = this.map.infoWindow;

            this.zt = domConstruct.toDom(
                '<a title="Zoom" to="" class="action zoomTo" href="javascript:void(0);"><span>' +
                    //esriBundle.widgets.popup.NLS_zoomTo + '</span></a>');
                    "Zoomer sur</span></a>"
            );
            domConstruct.place(this.zt, this.actionsListDiv);

            var editLabel = this.featureActionManager.getActionsByActionName("Edit");
            if (!editLabel || editLabel.length == 0 || !editLabel[0].label) editLabel = "Mod";
            else editLabel = editLabel[0].label;

            this.editAction = domConstruct.toDom('<a title="Modifier" to="" class="action edit" href="javascript:void(0);"><span>' + editLabel + "</span></a>");
            domConstruct.place(this.editAction, this.actionsListDiv);

            //this.deleteAction = domConstruct.toDom('<a title="Effacer" to="" class="action delete" href="javascript:void(0);"><span>Effacer</span></a>');
            //domConstruct.place(this.deleteAction, this.actionsListDiv);

            this.clearSel = domConstruct.toDom(
                '<a title="' + this.nls.clearseltip + '" to="" class="action clearSel" href="javascript:void(0);"><span>' + this.nls.clearsel + "</span></a>"
            );
            domConstruct.place(this.clearSel, this.actionsListDiv);
            topic.subscribe("widgetsActionsRegistered", lang.hitch(this, this._onWidgetsActionsRegistered));
            this._createPopupMenuButton();
            this.setEvtHandlers();
            this.onWindowResize();
        },

        _onWidgetsActionsRegistered: function () {
            if (this.selectedFeature) {
                this._initPopupMenu();
            }
        },

        onWindowResize: function () {
            var mapMan = MapManager.getInstance();
            if (mapMan.isMobileInfoWindow) {
                this.map.setInfoWindow(mapMan._mapInfoWindow);
                this.popup = this.map.infoWindow;
                //this.setEvtHandlers();
                mapMan.isMobileInfoWindow = false;
            }
        },

        _initPopupMenu: function () {
            this.featureActionManager.getSupportedActions(this.selectedFeature).then(
                lang.hitch(this, function (actions) {
                    var popupActions = actions.filter(
                        lang.hitch(this, function (action) {
                            return ["ZoomTo", "ShowPopup", "Flash"].indexOf(action.name) < 0;
                        })
                    );

                    if (popupActions.length === 0) {
                        html.addClass(this.popupMenuButton, "disabled");
                    } else {
                        html.removeClass(this.popupMenuButton, "disabled");
                    }
                    var menuActions = popupActions.map(
                        lang.hitch(this, function (action) {
                            action.data = jimuUtils.toFeatureSet(this.selectedFeature);
                            return action;
                        })
                    );
                    this.popupMenu.setActions(menuActions);
                })
            );
        },

        _createPopupMenuButton: function () {
            this.popupMenuButton = html.create(
                "span",
                {
                    class: "popup-menu-button",
                },
                query(".actionList", this.domNode)[0]
            );

            on(this.popupMenuButton, "click", lang.hitch(this, this._onPopupMenuButtonClick));
        },

        _onPopupMenuButtonClick: function (evt) {
            var position = html.position(evt.target);
            this.popupMenu.show(position);
        },

        setEvtHandlers: function () {
            this.own(
                on(
                    this.popup,
                    "selection-change",
                    lang.hitch(this, function (evt) {
                        this.selectedFeature = evt.target.getSelectedFeature();
                        if (this.selectedFeature) {
                            this._initPopupMenu();
                        }

                        this.displayPopupContent(this.popup.getSelectedFeature());
                    })
                )
            );

            this.own(
                on(
                    this.popup,
                    "clear-features",
                    lang.hitch(this, function () {
                        this.relatedContent.innerHTML = "";
                        if (this.instructions) {
                            domUtils.show(this.instructions);
                            this.instructions.innerHTML = this.nls.selectfeatures;
                        }
                        if (this.popupContent) {
                            this.popupContent.innerHTML = "";
                            //this.popupContent.set("content", "");
                        }
                        domUtils.hide(this.pager);
                    })
                )
            );

            this.own(
                on(
                    this.popup,
                    "set-features",
                    lang.hitch(this, function () {
                        if (!this.popup.features) {
                            domUtils.hide(this.pager);
                            domUtils.show(this.instructions);
                            domUtils.hide(this.actionsPaneDiv);
                            return;
                        }
                        if (this.popup.features.length === 0) {
                            domUtils.show(this.instructions);
                            domUtils.hide(this.actionsPaneDiv);
                        } else {
                            domUtils.hide(this.instructions);
                            domUtils.show(this.actionsPaneDiv);
                        }
                        //this.displayPopupContent(this.popup.getSelectedFeature());
                        this.featureCount.innerHTML = "(1 de " + this.popup.features.length + ")";

                        //enable navigation if more than one feature is selected
                        if (this.popup.features.length > 1) {
                            domUtils.show(this.pager);
                            domClass.add(this.previous, "hidden");
                            domClass.remove(this.next, "hidden");
                            domClass.remove(this.clearSel, "hidden");
                        } else if (this.popup.features.length === 1) {
                            domUtils.show(this.pager);
                            domClass.add(this.previous, "hidden");
                            domClass.add(this.next, "hidden");
                            domClass.add(this.clearSel, "hidden");
                        } else {
                            domUtils.hide(this.pager);
                            domClass.add(this.clearSel, "hidden");
                        }
                    })
                )
            );

            this.own(
                on(
                    this.previous,
                    "click",
                    lang.hitch(this, function () {
                        this.selectPrevious();
                    })
                )
            );
            this.own(
                on(
                    this.next,
                    "click",
                    lang.hitch(this, function () {
                        this.selectNext();
                    })
                )
            );
            this.own(on(this.btnClear, "click", lang.hitch(this, this.clearResults)));
            this.own(on(this.zt, "click", lang.hitch(this, this.zoomToClicked)));
            this.own(on(this.editAction, "click", lang.hitch(this, this.doEditAction))); // LDC

            this.own(on(this.clearSel, "click", lang.hitch(this, this.clearSelResults)));
            this.own(on(window, "resize", lang.hitch(this, this.onWindowResize)));

            this.own((this.clearEvt = on(this.btnClear, "click", lang.hitch(this, this.clearResults))));
            this.own((this.zoomToEvt = on(this.zt, "click", lang.hitch(this, this.zoomToClicked))));
            this.own((this.clearSelEvt = on(this.clearSel, "click", lang.hitch(this, this.clearSelResults))));
            this.own((this.resizeEvt = on(window, "resize", lang.hitch(this, this.onWindowResize))));

            /* this.own(
                on(
                    this.surveyTabButton,
                    "click",
                    lang.hitch(this, function () {
                        this.displaySurveyContent();
                    })
                )
            );
            this.own(
                on(
                    this.formTabButton,
                    "click",
                    lang.hitch(this, function () {
                        this.displayFormContent();
                    })
                )
            ); */

            /*  this.own(
                on(
                    this.backToList,
                    "click",
                    lang.hitch(this, function () {
                        this.showListForm();
                    })
                )
            ); */
        },

        doEditAction: function () {
            var edit = this.featureActionManager.getActionsByActionName("Edit");

            if (!edit || edit.length == 0) return alert("No edit widget found.");

            edit[0].onExecute(jimuUtils.toFeatureSet(this.selectedFeature));
            this.closeWidget();
        },

        clearSelResults: function () {
            var curFeats = this.popup.features;
            curFeats.splice(this.popup.selectedIndex, 1);
            this.popup.setFeatures(curFeats);
        },

        zoomToClicked: function (e) {
            this.popup._zoomToFeature(e);
        },

        clearResults: function () {
            if (this.config.closeOnClear) {
                this.closeWidget();
            }
            if (this.instructions) {
                domUtils.show(this.instructions);
                this.instructions.innerHTML = this.nls.selectfeatures;
            }
            if (this.popupContent) {
                this.popupContent.innerHTML = "";
                //this.popupContent.set("content", "");
            }

            var table = document.getElementById("formTableId");
            if (table) {
                table.innerHTML = "";
            }

            domUtils.hide(this.pager);
            domUtils.hide(this.actionsPaneDiv);
            this.popup.clearFeatures();
        },

        startup: function () {
            this.inherited(arguments);
            this.inPanel = this.getPanel();
            this.displayPopupContent(this.popup.getSelectedFeature());
            if (this.config.closeAtStart) {
                if (!this.popup.getSelectedFeature()) {
                    setTimeout(
                        lang.hitch(this, function () {
                            this.closeWidget();
                        }),
                        300
                    );
                }
            }
        },

        closeWidget: function () {
            if (this.inPanel) {
                //console.info(this.inPanel);
                if (this.appConfig.theme.name === "JewelryBoxTheme") {
                    PanelManager.getInstance().minimizePanel(this.inPanel);
                    html.addClass(this.map.container.parentNode, "sideBarHidden");
                } else if (this.appConfig.theme.name === "TabTheme") {
                    var sbc = WidgetManager.getInstance().getWidgetsByName("SidebarController")[0];
                    sbc._doResize();
                } else {
                    PanelManager.getInstance().closePanel(this.inPanel);
                }
            } else {
                WidgetManager.getInstance().closeWidget(this);
            }
        },

        onOpen: function () {
            var mapMan = MapManager.getInstance();
            if (mapMan.isMobileInfoWindow) {
                this.map.setInfoWindow(mapMan._mapInfoWindow);
                mapMan.isMobileInfoWindow = false;
            }
            //hide the standard esri popup instead
            html.addClass(query(".esriPopup")[0], "myPopupHidden");
        },

        onDestroy: function () {
            var mapMan = MapManager.getInstance();
            mapMan.resetInfoWindow(false);
            if (!mapMan.isMobileInfoWindow) {
                html.removeClass(query(".esriPopup")[0], "myPopupHidden");
            }
        },

        onClose: function () {
            this.clearResults();
        },

        displayPopupContent: function (feature) {
            if (feature) {
                if (this.inPanel) {
                    if (this.appConfig.theme.name === "JewelryBoxTheme") {
                        PanelManager.getInstance().maximizePanel(this.inPanel);
                    } else if (this.appConfig.theme.name === "TabTheme") {
                        var sbc = WidgetManager.getInstance().getWidgetsByName("SidebarController")[0];
                        sbc._resizeToMax();
                    } else {
                        PanelManager.getInstance().normalizePanel(this.inPanel);
                    }
                } else {
                    WidgetManager.getInstance().triggerWidgetOpen(this.id);
                }

                this.tabHeader.innerHTML = "";
                this.firstTabVisible = false;
                domUtils.hide(this.tabHeader);

                var infoTemplate = feature.getInfoTemplate();

                if (this.popupContent) {
                    //this.popupContent.set("content", content);

                    const tabContent = document.createElement("div");
                    //tabContent.setAttribute("class", "contentForm");

                    this.popupContent.appendChild(tabContent);

                    const title = feature.getTitle();

                    const tabContentTitle = document.createElement("p");
                    tabContentTitle.setAttribute("class", "formTitleClass");
                    tabContentTitle.innerHTML = title;

                    tabContent.appendChild(tabContentTitle);

                    const line = document.createElement("div");
                    line.setAttribute("class", "formLineClass");

                    tabContent.appendChild(line);

                    const tabContentTable = document.createElement("table");
                    tabContentTable.setAttribute("class", "tabContentTable");
                    tabContent.appendChild(tabContentTable);

                    for (var i = 0; i < infoTemplate.info.fieldInfos.length; i++) {
                        if (infoTemplate.info.fieldInfos[i].visible) {
                            var field = infoTemplate.info.fieldInfos[i];

                            var attributeName = field.label;
                            var attributeValue = feature.attributes[field.fieldName];

                            if (field.type == "esriFieldTypeDate") attributeValue = this.dateToString(attributeValue);

                            var tr = document.createElement("tr");

                            var td = document.createElement("td");
                            td.className = "attrName";
                            td.innerHTML = attributeName;

                            var td2 = document.createElement("td");

                            if (this.isValidHttpUrl(attributeValue)) {
                                var link = document.createElement("a");
                                link.setAttribute("href", attributeValue);
                                link.setAttribute("target", "_blank");
                                link.innerHTML = attributeValue;
                                td2.appendChild(link);
                            } else td2.innerHTML = attributeValue;

                            tr.appendChild(td);
                            tr.appendChild(td2);
                            tabContentTable.appendChild(tr);
                        }
                    }

                    const line2 = document.createElement("div");
                    line2.setAttribute("class", "formLineClass");
                    this.popupContent.appendChild(line2);

                    this.displayTabActionDiv = document.createElement("div");
                    this.displayTabActionDiv.setAttribute("class", "actionsPane actionList");
                    this.displayTabActionDiv.setAttribute("style", "padding-bottom: 8px");
                    this.displayTabActionDiv.onclick = () => {
                        //this.displayEditTabContent(title, feature, feature.getLayer());
                        console.log("Display tab content")
                    };

                    this.popupContent.appendChild(this.displayTabActionDiv);

                    this.editTable = domConstruct.toDom(
                        '<a title="Edit table" to="" class="action editTable" href="javascript:void(0);"><span>Editer la table</span></a>'
                    );
                    domConstruct.place(this.editTable, this.displayTabActionDiv);
                }

                this.displayOnPopup(this.popupContent);
                this.searchForRelationships(feature, feature.getLayer());
                domUtils.show(this.actionsPaneDiv);

                //this.displayTabContent(title, feature, layer, tab);
            } else {
                domUtils.hide(this.pager);
                domUtils.show(this.instructions);
                domUtils.hide(this.actionsPaneDiv);
                domUtils.hide(this.tabHeader);
            }
        },

        searchForRelationships: function (feature, layer, parentTab) {
            //TO DO GET RELATION SHIP

            if (this.requestIsBusy) {
                this.searchForRelationShipsHandle.cancel();
            }

            this.searchForRelationShipsHandle = esriRequest({
                url: layer.url,
                content: {
                    f: "json",
                },
                callbackParamName: "callback",
            });

            this.requestIsBusy = true;

            this.searchForRelationShipsHandle.then(
                (response) => {
                    this.requestIsBusy = false;

                    /* console.log("response", response);
                    console.log("relationships", response.relationships); */

                    if (response && response.relationships && response.relationships.length) {
                        var relationsShips = response.relationships
                            .map((relationship) => {
                                if (relationship && relationship.role && relationship.role == "esriRelRoleOrigin") {
                                    return relationship;
                                }
                            })
                            .filter((item) => item);

                        if (relationsShips.length) {
                            if (!this.firstTabVisible) {
                                var popupTab = document.createElement("p");
                                popupTab.innerHTML = response.name;
                                popupTab.className = "selected";

                                this.selectedTab = popupTab;
                                this.tabHeader.appendChild(popupTab);
                                this.firstTabVisible = true;
                                this.own(
                                    on(
                                        popupTab,
                                        "click",
                                        lang.hitch(this, function () {
                                            this.displayPopupContentTab(popupTab);
                                        })
                                    )
                                );
                            }

                            relationsShips.forEach((relationsShip) => {
                                this.queryRelatedFeatures(feature, layer, relationsShip, parentTab);
                            });

                            domUtils.show(this.tabHeader);
                        }
                    } else {
                        console.log("ELSE");
                    }
                },
                (error) => {
                    console.log("error", error);
                }
            );
        },

        queryRelatedFeatures: function (feature, layer, relationsShip, parentTab) {
            //console.log("queryRelatedFeatures", feature, relationsShip);

            var objectId = feature.attributes[Object.keys(feature.attributes).find((key) => key.toLowerCase() === "objectid".toLowerCase())];

            var relatedQuery = new RelationshipQuery();
            relatedQuery.outFields = ["*"];
            relatedQuery.relationshipId = relationsShip.id;
            relatedQuery.objectIds = [objectId];
            layer.queryRelatedFeatures(relatedQuery, (relatedRecords) => {
                if (relatedRecords[objectId] && relatedRecords[objectId].features && relatedRecords[objectId].features.length) {
                    var featureSet = relatedRecords[objectId];

                    /* this.formTabButton.style.display = "inline-block"; */

                    var globalLayerUrl = layer.url.substr(0, layer.url.lastIndexOf("/")) + "/";
                    var popupLayerUrl = globalLayerUrl + relationsShip.relatedTableId;

                    var layerFromMap = this.getLayerOrTableFromMap(popupLayerUrl);

                    var myLayer = new FeatureLayer(layerFromMap.url);

                    if (layerFromMap.popupInfo) {
                        this.createTab(featureSet, relationsShip, layerFromMap.popupInfo, myLayer, parentTab);
                    }
                } else {
                    console.log("No related found");
                }
            });
        },

        createTab: function (featureSet, relationsShip, popupTemplate, layer, parentTab) {
            //console.log("createTab", featureSet, popupTemplate, layer);

            const tabList = document.createElement("div");
            tabList.setAttribute("class", "contentForm");
            tabList.setAttribute("data-dojo-attach-point", "listForm");

            this.relatedList.appendChild(tabList);

            const tabListTitle = document.createElement("p");
            tabListTitle.setAttribute("class", "formListTitle");
            tabListTitle.innerHTML = relationsShip.name;

            tabList.appendChild(tabListTitle);

            const line = document.createElement("div");
            line.setAttribute("class", "formLineClass");

            tabList.appendChild(line);

            const tabListTable = document.createElement("table");
            tabListTable.setAttribute("class", "tabListTable");
            tabList.appendChild(tabListTable);

            var tab = document.createElement("p");
            tab.innerHTML = relationsShip.name;
            this.tabHeader.appendChild(tab);

            if (parentTab) {
                if (!parentTab.relationshipChilds) parentTab.relationshipChilds = [];

                parentTab.relationshipChilds.push(tab);
            }

            this.own(
                on(
                    tab,
                    "click",
                    lang.hitch(this, () => {
                        if (tab.relationshipChilds && tab.relationshipChilds.length) {
                            tab.relationshipChilds.forEach((relationshipChildTab) => {
                                this.tabHeader.removeChild(relationshipChildTab);
                            });
                            tab.relationshipChilds = [];
                        }

                        this.relatedContent.innerHTML = "";

                        this.displayOnPopup(tabList);

                        if (this.selectedTab) {
                            this.selectedTab.className = "";
                        }
                        this.selectedTab = tab;
                        this.selectedTab.className = "selected";

                        domUtils.hide(this.actionsPaneDiv);
                        domUtils.hide(this.popupContent);
                    })
                )
            );

            for (var i = 0; i < featureSet.features.length; i++) {
                featureSet.features[i].setInfoTemplate(popupTemplate);

                var feature = featureSet.features[i];

                var tr = document.createElement("tr");

                tr.feature = feature;

                tr.addEventListener("click", (event) => {
                    var feature = event.target.parentElement.feature;
                    var title = event.target.parentElement.featureTitle;

                    this.displayTabContent(title, feature, layer, tab);
                    //this.displayEditTabContent(title, feature, layer, tab);
                });

                var infoTemplateTitle = feature.infoTemplate.title;
                var featureAttributes = feature.attributes;
                var rxp = /{([^}]+)}/g;
                var curMatch = null;

                while ((curMatch = rxp.exec(infoTemplateTitle))) {
                    infoTemplateTitle = this.replaceAll(infoTemplateTitle, curMatch[0], featureAttributes[curMatch[1]]);
                    // infoTemplateTitle = infoTemplateTitle.replaceAll(curMatch[0], featureAttributes[curMatch[1]]);
                }

                var title = infoTemplateTitle;
                var td2 = document.createElement("td");
                td2.innerHTML = title;

                tr.featureTitle = title;
                tr.appendChild(td2);
                tabListTable.appendChild(tr);
            }
        },

        getLayerOrTableFromMap: function (popupLayerUrl) {
            var tablesAndOperationLayers = this.map.itemInfo.itemData.operationalLayers.concat(this.map.itemInfo.itemData.tables);

            var foundLayerOrTable = null;

            for (let i = 0; i < tablesAndOperationLayers.length; i++) {
                const tableOrLayer = tablesAndOperationLayers[i];
                if (tableOrLayer.url == popupLayerUrl) {
                    foundLayerOrTable = tableOrLayer;

                    //this.relatedDataLayerTitle.innerHTML = tableOrLayer.title;
                    //  this.backToList.innerHTML = "Retour vers la liste: " + tableOrLayer.title;
                    break;
                }
            }

            return foundLayerOrTable;
        },

        getField: function (fieldName, fields) {
            for (var i = 0; i < fields.length; i++) {
                if (fields[i].name == fieldName) return fields[i];
            }

            return null;
        },

        //replaceAll alternative
        escapeRegExp: function (string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
        },

        replaceAll: function (str, find, replace) {
            return str.replace(new RegExp(this.escapeRegExp(find), "g"), replace);
        },
        //replaceAll alternative

        displayOnPopup: function (elementToShow) {
            domUtils.hide(this.currentDisplay);
            domUtils.show(elementToShow);

            this.popupPanel.parentElement.scroll(0, 0);

            this.currentDisplay = elementToShow;
        },

        displayPopupContentTab: function (popupTab) {
            this.relatedContent.innerHTML = "";

            domUtils.hide(this.currentDisplay);

            if (this.selectedTab) {
                this.selectedTab.className = "";
            }
            this.selectedTab = popupTab;
            this.selectedTab.className = "selected";

            if (this.editActionDiv) domUtils.hide(this.editActionDiv);
            if (this.saveActionDiv) domUtils.hide(this.saveActionDiv);

            domUtils.show(this.actionsPaneDiv);
            domUtils.show(this.popupContent);
        },

        displayTabContent: function (title, feature, layer, parentTab) {
            if (parentTab.relationshipChilds && parentTab.relationshipChilds.length) {
                parentTab.relationshipChilds.forEach((relationshipChildTab) => {
                    this.tabHeader.removeChild(relationshipChildTab);
                });
                parentTab.relationshipChilds = [];
            }
            this.relatedContent.innerHTML = "";
            const tabContent = document.createElement("div");
            tabContent.setAttribute("class", "contentForm");

            this.relatedContent.appendChild(tabContent);

            /*  const tabContentTitle = document.createElement("p");
            tabContentTitle.setAttribute("class", "formTitleClass");
            tabContentTitle.innerHTML = title;

            tabContent.appendChild(tabContentTitle);

            const line = document.createElement("div");
            line.setAttribute("class", "formLineClass");

            tabContent.appendChild(line); */

            const tabContentTable = document.createElement("table");
            tabContentTable.setAttribute("class", "tabContentTable");
            tabContent.appendChild(tabContentTable);

            for (var i = 0; i < feature.infoTemplate.fieldInfos.length; i++) {
                if (feature.infoTemplate.fieldInfos[i].visible) {
                    var field = feature.infoTemplate.fieldInfos[i];

                    var attributeName = field.label;
                    var attributeValue = feature.attributes[field.fieldName];

                    if (field.type == "esriFieldTypeDate") attributeValue = this.dateToString(attributeValue);

                    var tr = document.createElement("tr");

                    var td = document.createElement("td");
                    td.className = "attrName";
                    td.innerHTML = attributeName;

                    var td2 = document.createElement("td");

                    if (this.isValidHttpUrl(attributeValue)) {
                        var link = document.createElement("a");
                        link.setAttribute("href", attributeValue);
                        link.setAttribute("target", "_blank");
                        link.innerHTML = attributeValue;
                        td2.appendChild(link);
                    } else td2.innerHTML = attributeValue;

                    tr.appendChild(td);
                    tr.appendChild(td2);
                    tabContentTable.appendChild(tr);
                }
            }

            const line = document.createElement("div");
            line.setAttribute("class", "formLineClass");
            this.relatedContent.appendChild(line);

            this.displayTabActionDiv = document.createElement("div");
            this.displayTabActionDiv.setAttribute("class", "actionsPane actionList");
            this.displayTabActionDiv.setAttribute("style", "padding-bottom: 8px");
            this.displayTabActionDiv.onclick = () => {
                this.displayEditTabContent(title, feature, layer, parentTab);
            };

            this.relatedContent.appendChild(this.displayTabActionDiv);

            this.editTable = domConstruct.toDom(
                '<a title="Edit table" to="" class="action editTable" href="javascript:void(0);"><span>Editer la table</span></a>'
            );
            domConstruct.place(this.editTable, this.displayTabActionDiv);

            //domUtils.show(this.displayTabActionDiv);
            this.displayOnPopup(tabContent);
            this.searchForRelationships(feature, layer, parentTab);
        },

        displayEditTabContent: function (title, feature, layer, parentTab) {
            const orignalFeatureAttributes = JSON.parse(JSON.stringify(feature.attributes));
            if (parentTab.relationshipChilds && parentTab.relationshipChilds.length) {
                parentTab.relationshipChilds.forEach((relationshipChildTab) => {
                    this.tabHeader.removeChild(relationshipChildTab);
                });
                parentTab.relationshipChilds = [];
            }
            this.relatedContent.innerHTML = "";

            const tabContent = document.createElement("div");
            tabContent.setAttribute("class", "contentForm");

            this.relatedContent.appendChild(tabContent);
            /* 
            const tabContentTitle = document.createElement("p");
            tabContentTitle.setAttribute("class", "formTitleClass");
            tabContentTitle.innerHTML = title;

            tabContent.appendChild(tabContentTitle);

            const line = document.createElement("div");
            line.setAttribute("class", "formLineClass");

            tabContent.appendChild(line); */

            const tabContentTable = document.createElement("table");
            tabContentTable.setAttribute("class", "tabContentTable");
            tabContent.appendChild(tabContentTable);

            for (var i = 0; i < feature.infoTemplate.fieldInfos.length; i++) {
                if (feature.infoTemplate.fieldInfos[i].visible) {
                    var field = feature.infoTemplate.fieldInfos[i];

                    var attributeName = field.label;
                    var attributeValue = feature.attributes[field.fieldName];

                    var tr = document.createElement("tr");

                    var td = document.createElement("td");
                    td.className = "attrName";
                    td.innerHTML = attributeName;

                    var td2 = document.createElement("td");

                    var foundField = layer.fields.find((originalField) => {
                        return originalField.name === field.fieldName;
                    });

                    if (foundField.type == "esriFieldTypeDate") {
                        var dataTextBoxContainer = document.createElement("div");
                        td2.appendChild(dataTextBoxContainer);

                        const dateTextBox = new DateTextBox(
                            {
                                required: foundField && !foundField.nullable ? true : false,
                                value: new Date(parseInt(attributeValue)),
                                featureAttribute: field.fieldName,
                                disabled: foundField && !foundField.editable ? true : false,
                                style: "width: 100%;",
                            },
                            dataTextBoxContainer
                        );

                        dateTextBox.on("change", (event) => {
                            feature.attributes[dateTextBox.featureAttribute] = event.getTime();
                            //feature.attributes[event.target.featureAttribute] = event.target.value;
                        });
                    } else if (foundField.domain) {
                        var memoryStore = new Memory({
                            data: foundField.domain.codedValues,
                        });

                        var comboxBoxContainer = document.createElement("div");
                        td2.appendChild(comboxBoxContainer);

                        const comboBox = new ComboBox(
                            {
                                required: foundField && !foundField.nullable ? true : false,
                                value: attributeValue,
                                store: memoryStore,
                                searchAttr: "name",
                                featureAttribute: field.fieldName,
                                disabled: foundField && !foundField.editable ? true : false,
                            },
                            comboxBoxContainer
                        );

                        comboBox.on("change", (value) => {
                            feature.attributes[comboBox.featureAttribute] = value;
                        });
                    } else {
                        var validationTextBoxContainer = document.createElement("div");
                        td2.appendChild(validationTextBoxContainer);

                        const validationTextBox = new ValidationTextBox(
                            {
                                required: foundField && !foundField.nullable ? true : false,
                                trim: true,
                                value: attributeValue,
                                featureAttribute: field.fieldName,
                                disabled: foundField && !foundField.editable ? true : false,
                                style: "width: 100%;",
                                maxLength: foundField && foundField.length ? foundField.length : null,
                            },
                            validationTextBoxContainer
                        );

                        validationTextBox.on("change", (event) => {
                            feature.attributes[validationTextBox.featureAttribute] = event;
                        });
                    }

                    tr.appendChild(td);
                    tr.appendChild(td2);
                    tabContentTable.appendChild(tr);
                }
            }

            const line = document.createElement("div");
            line.setAttribute("class", "formLineClass");
            this.relatedContent.appendChild(line);

            this.editTabActionDiv = document.createElement("div");
            this.editTabActionDiv.setAttribute("class", "actionsPane actionList");
            this.editTabActionDiv.setAttribute("style", "padding-bottom: 8px;display: flex;justify-content: space-evenly;");

            this.relatedContent.appendChild(this.editTabActionDiv);

            this.saveTable = domConstruct.toDom(
                '<div><a title="Save table" to="" class="action saveTable" href="javascript:void(0);"><span>Sauver la table</span></a></div>'
            );
            this.saveTable.onclick = () => {
                this.saveTableApplyEdit(feature, layer);

                this.displayTabContent(title, feature, layer, parentTab);
            };

            domConstruct.place(this.saveTable, this.editTabActionDiv);

            this.cancelEdit = domConstruct.toDom(
                '<div><a title="Cancel edit" to="" class="action cancelEdit" href="javascript:void(0);"><span>Annuler</span></a></div>'
            );
            this.cancelEdit.onclick = () => {
                feature.attributes = orignalFeatureAttributes;

                this.displayTabContent(title, feature, layer, parentTab);
            };

            domConstruct.place(this.cancelEdit, this.editTabActionDiv);

            this.displayOnPopup(tabContent);
            //this.searchForRelationships(feature, layer, parentTab);
        },

        isValidHttpUrl: function (string) {
            let url;

            try {
                url = new URL(string);
            } catch (_) {
                return false;
            }

            return url.protocol === "http:" || url.protocol === "https:";
        },

        saveTableApplyEdit: function (feature, layer) {
            layer.on("edits-complete", (event) => {
                console.log("EDIT COMPLETE", event);

                if (!event.updates[0].success) {
                    alert("error: " + event.updates[0].error.message);
                }
            });

            //Update
            layer.applyEdits(null, [feature], null);

            /* .then(function(results) {
                    console.log("edits added: ", results);
                  }); */
        },

        selectPrevious: function () {
            this.popup.selectPrevious();
            this.featureCount.innerHTML = "(" + (this.popup.selectedIndex + 1) + " de " + this.popup.features.length + ")";
            if (this.popup.selectedIndex + 1 < this.popup.features.length) {
                domClass.remove(this.next, "hidden");
            }
            if (this.popup.selectedIndex === 0) {
                domClass.add(this.previous, "hidden");
            }
        },

        selectNext: function () {
            domClass.remove(this.previous, "hidden");
            this.popup.selectNext();
            this.featureCount.innerHTML = "(" + (this.popup.selectedIndex + 1) + " de " + this.popup.features.length + ")";
            if (this.popup.selectedIndex + 1 === this.popup.features.length) {
                domClass.add(this.next, "hidden");
            }
        },

        dateToString: function (date) {
            var result = "";

            /*var month = date.getMonth();
		  switch(month)
		  {
			  case 0: result = "janvier"; break;
			  case 1: result = "f�vrier"; break;
			  case 2: result = "mars"; break;
			  case 3: result = "avril"; break;
			  case 4: result = "mai"; break;
			  case 5: result = "juin"; break;
			  case 6: result = "juillet"; break;
			  case 7: result = "ao�t"; break;
			  case 8: result = "septembre"; break;
			  case 9: result = "octobre"; break;
			  case 10: result = "novembre"; break;
			  case 11: result = "d�cembre"; break;
			  default: break;
		  }
		  
		  var day = date.getDate();
		  result += " " + day; 
		  
		  var year = date.getFullYear();
		  result += ", " + year;*/

            var d = new Date(parseInt(date)); // + (new Date().getTimezoneOffset() * 1000 * 60));
            result =
                ("00" + d.getDate()).slice(-2) +
                "/" +
                ("00" + (d.getMonth() + 1)).slice(-2) +
                "/" +
                d.getFullYear() +
                " " +
                ("00" + d.getHours()).slice(-2) +
                ":" +
                ("00" + d.getMinutes()).slice(-2);

            return result;
        },

        getValueFromDomainCode: function (fieldName, code, fields) {
            var field = null;

            for (var i = 0; i < fields.length; i++) {
                if (fields[i].name == fieldName) {
                    field = fields[i];
                    break;
                }
            }

            if (!field) return code;

            if (!field.domain || !field.domain.codedValues) return code;

            var codedValues = field.domain.codedValues;

            for (var j = 0; j < codedValues.length; j++) {
                if (codedValues[j].code == code) return codedValues[j].name;
            }

            return code;
        },

        isAdmin: function () {
            for (var i = 0; i < esri.id.credentials.length; i++) {
                if (esri.id.credentials[i].scope == "server") {
                    if (esri.id.credentials[i].isAdmin) return true;
                    else return false;
                }
            }
            return false;
        },
    });
});
