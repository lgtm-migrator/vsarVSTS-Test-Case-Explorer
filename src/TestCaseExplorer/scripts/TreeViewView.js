/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
define(["require", "exports", "VSS/Controls", "VSS/Controls/TreeView", "VSS/Controls/Common", "scripts/TreeViewDataService"], function (require, exports, Controls, TreeView, CommonControls, TreeViewDataService) {
    var TreeviewView = (function () {
        function TreeviewView() {
        }
        TreeviewView.prototype.initialize = function (callback) {
            var cboSources = ["Area path", "Iteration path", "Priority", "State", "Test plan", "Team"];
            var cbo = Controls.create(CommonControls.Combo, $("#treeview-Cbo-container"), {
                source: cboSources
            });
            cbo.setText(cboSources[0]);
            var treeOptions = {
                width: 400,
                height: "100%",
                nodes: null
            };
            var callbackFunction = callback;
            $("#treeview-Cbo-container").change(function () {
                TreeViewDataService.getNodes(cbo.getText()).then(function (data) {
                    treeOptions.nodes = data;
                    var treeview = Controls.create(TreeView.TreeView, $("#treeview-container"), treeOptions);
                    treeview.onItemClick = function (node, nodeElement, e) {
                        callbackFunction(cbo.getText(), node.text);
                        $("#treeview-value").text(node.text);
                    };
                });
                // treeview.setDataSource(convertToTreeNodes(getNodes(cbo.getText())));
                //treeOptions.nodes = convertToTreeNodes(getNodes(cbo.getText()));
                //Controls.create(TreeView.TreeView, $("#treeview-container"), treeOptions);
            });
        };
        return TreeviewView;
    })();
    exports.TreeviewView = TreeviewView;
});
//# sourceMappingURL=TreeViewView.js.map