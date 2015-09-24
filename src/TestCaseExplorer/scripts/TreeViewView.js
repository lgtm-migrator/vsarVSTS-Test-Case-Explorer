/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
define(["require", "exports", "VSS/Controls", "VSS/Controls/TreeView", "VSS/Controls/Common", "scripts/TreeViewDataService"], function (require, exports, Controls, TreeView, CommonControls, TreeViewDataService) {
    var TreeviewView = (function () {
        function TreeviewView() {
        }
        TreeviewView.prototype.initialize = function (callback) {
            var cboSources = ["Area path", "Iteration path", "Priority", "State", "Test plan", "Team"];
            var cbo = Controls.create(CommonControls.Combo, $("#treeview-Cbo-container"), {
                mode: "drop",
                allowEdit: false,
                source: cboSources
            });
            var treeOptions = {
                width: 400,
                height: "100%",
                nodes: null
            };
            var treeview = Controls.create(TreeView.TreeView, $("#treeview-container"), treeOptions);
            treeview.onItemClick = function (node, nodeElement, e) {
                callback(cbo.getText(), node.config);
            };
            //Hock up chnage for cbo to redraw treeview
            $("#treeview-Cbo-container").change(function () {
                LoadTreeview(cbo.getText(), treeview);
                VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
                    // Set value in user scope
                    dataService.setValue("SelectedPivot", cbo.getText(), { scopeType: "User" }).then(function (selectedPivot) {
                    });
                });
            });
            //Initilaizer def value
            VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
                // Set value in user scope
                dataService.getValue("SelectedPivot", { scopeType: "User" }).then(function (selectedPivot) {
                    if (selectedPivot == null || selectedPivot == "") {
                        selectedPivot = cboSources[0];
                    }
                    cbo.setText(selectedPivot);
                    LoadTreeview(cbo.getText(), treeview);
                });
            });
        };
        return TreeviewView;
    })();
    exports.TreeviewView = TreeviewView;
    function LoadTreeview(pivot, treeview) {
        TreeViewDataService.getNodes(pivot).then(function (data) {
            treeview.rootNode.clear();
            treeview.rootNode.addRange(data);
            treeview._draw();
        });
    }
});
//# sourceMappingURL=TreeViewView.js.map