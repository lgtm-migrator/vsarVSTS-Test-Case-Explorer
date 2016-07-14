//---------------------------------------------------------------------
// <copyright file="app.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
//    This is part of the Test Case Explorer extensions
//    from the ALM Rangers. This file contains mainly common 
//    application initialization code.
// </summary>
//---------------------------------------------------------------------
define(["require", "exports", "scripts/Common", "scripts/DetailsToggle", "scripts/DetailsView", "scripts/TestCaseView", "scripts/TreeViewView", "VSS/Controls", "VSS/Controls/Splitter"], function (require, exports, Common, DetailsToggle, DetailsView, TestCaseView, TreeViewView, Controls, SplitterControls) {
    "use strict";
    /// <reference path='../typings/tsd.d.ts' />
    console.log("Loading TestCaseExplorer version " + VSS.getExtensionContext().version) + "...";
    Common.WIQLConstants.getWiqlConstants();
    var paneToggler = new DetailsToggle.DetailsPaneToggler();
    var dv = new DetailsView.DetailsView();
    var tc = new TestCaseView.TestCaseView();
    tc.initialize(paneToggler, RefreshPane);
    var tv = new TreeViewView.TreeviewView();
    var leftSplitter = Controls.Enhancement.getInstance(SplitterControls.Splitter, $(".left-hub-splitter"));
    VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
        var posReq = dataService.getValue("LeftPaneWidth", { scopeType: "User" }).then(function (width) {
            leftSplitter.toggleExpanded(true);
            leftSplitter.resize(width);
        });
    });
    leftSplitter._element.on('changed', function () {
        saveWidth();
    });
    var splitter = Controls.Enhancement.getInstance(SplitterControls.Splitter, $(".right-hub-splitter"));
    paneToggler.init(this, $(".far-right-pane-pivot"), splitter, tc, dv).then(function (t) {
        tc.updateTogle(t);
    });
    tv.initialize(RefreshGrid);
    dv.initialize(paneToggler);
    function RefreshGrid(pivot, value, showRecursive) {
        tc.RefreshGrid(pivot, value, showRecursive);
        dv.selectionChanged(null);
    }
    function RefreshPane(id) {
        dv.selectionChanged(id);
    }
    function saveWidth() {
        var width = leftSplitter.leftPane.width();
        width = (width == 0 ? 200 : width);
        VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
            // Set value in user scope
            dataService.setValue("LeftPaneWidth", width, { scopeType: "User" }).then(function (value) {
            });
        });
    }
});
/*

var registrationForm = (function () {
    var callbacks = [];

    function inputChanged() {
        // Execute registered callbacks
        for (var i = 0; i < callbacks.length; i++) {
            callbacks[i](isValid());
        }
    }

    function isValid() {
        // Check whether form is valid or not
        return true;
    }

    function getFormData() {
        // Get form values
        return {
            //name: name.value,
            //dateOfBirth: dateOfBirth.value,
            //email: email.value
        };
    }

    return {
        isFormValid: function () {
            return isValid();
        },
        getFormData: function () {
            return getFormData();
        },
        attachFormChanged: function (cb) {
            callbacks.push(cb);
        }
    };
})();

// Register form object to be used accross this extension
VSS.register("columnOptionsForm", registrationForm);
*/ 
//# sourceMappingURL=app.js.map