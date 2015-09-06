define(["require", "exports", "TFS/WorkItemTracking/Contracts", "TFS/TestManagement/RestClient", "TFS/WorkItemTracking/RestClient", "VSS/Controls/TreeView"], function (require, exports, Contracts, TestClient, WITClient, TreeView) {
    function getNodes(param) {
        switch (param) {
            case "Area path":
                return getStructure(Contracts.TreeStructureGroup.Areas);
                break;
            case "Iteration path":
                return getStructure(Contracts.TreeStructureGroup.Iterations);
                break;
            case "Priority":
                return getPrioriy();
                break;
            case "State":
                return getStates();
                break;
            case "Test plan":
                return getTestPlans();
                break;
        }
    }
    exports.getNodes = getNodes;
    function getTestPlans() {
        // Get an instance of the client
        var deferred = $.Deferred();
        var tstClient = TestClient.getClient();
        tstClient.getPlans(VSS.getWebContext().project.name).then(function (data) {
            var d = [{
                    name: "Test plans", children: $.map(data, function (item) {
                        return { name: item.name };
                    })
                }];
            var d2 = convertToTreeNodes(d);
            deferred.resolve(d2);
        });
        return deferred.promise();
    }
    function getStructure(structure) {
        var deferred = $.Deferred();
        var client = WITClient.getClient();
        client.getClassificationNode(VSS.getWebContext().project.name, structure, null, 7).then(function (data) {
            var d = [];
            d.push(data);
            deferred.resolve(convertToTreeNodes(d));
        });
        //TODO - getClasification Node doesnt work as expected with areapath
        return deferred.promise();
    }
    function getStates() {
        var deferred = $.Deferred();
        var client = WITClient.getClient();
        var project = VSS.getWebContext().project.name;
        client.getWorkItemTypeCategory(project, "Microsoft.TestCaseCategory").then(function (witCat) {
            client.getWorkItemType(project, witCat.defaultWorkItemType.name).then(function (data) {
                var d = data;
                var t = { name: "States", children: [] };
                for (var s in d.transitions) {
                    t.children.push({ name: s });
                }
                var t2 = [];
                t2.push(t);
                deferred.resolve(convertToTreeNodes(t2));
            });
        });
        return deferred.promise();
    }
    function getPrioriy() {
        var deferred = $.Deferred();
        var client = WITClient.getClient();
        client.getWorkItemType(VSS.getWebContext().project.name, "Test case").then(function (data) {
            var d = [{ name: "Priority", children: [{ name: "1" }, { name: "2" }, { name: "3" }, { name: "4" }] }];
            deferred.resolve(convertToTreeNodes(d));
        });
        return deferred.promise();
    }
    // Converts the source to TreeNodes
    function convertToTreeNodes(items) {
        var a = [];
        items.forEach(function (item) {
            var node = new TreeView.TreeNode(item.name);
            node.icon = item.icon;
            node.expanded = item.expanded;
            if (item.children && item.children.length > 0) {
                node.addRange(convertToTreeNodes(item.children));
            }
            a.push(node);
        });
        return a;
    }
});
//# sourceMappingURL=TreeViewDataService.js.map