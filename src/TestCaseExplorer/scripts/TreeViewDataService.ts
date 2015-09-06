import Contracts = require("TFS/WorkItemTracking/Contracts");
import TestClient = require("TFS/TestManagement/RestClient");
import WITClient = require("TFS/WorkItemTracking/RestClient");
import TreeView = require("VSS/Controls/TreeView");


export function getNodes(param) {

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



    function getTestPlans(): IPromise<TreeView.TreeNode[]> {
        // Get an instance of the client
        var deferred = $.Deferred<TreeView.TreeNode[]>();

        var tstClient = TestClient.getClient();
        tstClient.getPlans(VSS.getWebContext().project.name).then(function (data) {

            var d = [{
                name: "Test plans", children: $.map(data, function (item) {
                    return { name: item.name };
                })
            }];
            var d2 = convertToTreeNodes(d)
            deferred.resolve(d2);
        });
        return deferred.promise();
    }

    function getStructure(structure: Contracts.TreeStructureGroup): IPromise<TreeView.TreeNode[]> {
        var deferred = $.Deferred<TreeView.TreeNode[]>();

        var client = WITClient.getClient();
        client.getClassificationNode(VSS.getWebContext().project.name, structure, null, 7).then(function (data) {

            var d = [];

            d.push(data);
            deferred.resolve(convertToTreeNodes(d));

        });
    
        //TODO - getClasification Node doesnt work as expected with areapath

  
        return deferred.promise();
    }

    function getStates(): IPromise<TreeView.TreeNode[]> {
        var deferred = $.Deferred<TreeView.TreeNode[]>();

        var client = WITClient.getClient();
        var project = VSS.getWebContext().project.name;

        client.getWorkItemTypeCategory(project, "Microsoft.TestCaseCategory").then(function (witCat) {

            client.getWorkItemType(project, witCat.defaultWorkItemType.name).then(function (data) {
                var d: any = data;

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

    function getPrioriy(): IPromise<TreeView.TreeNode[]> {
        var deferred = $.Deferred<TreeView.TreeNode[]>();

        var client = WITClient.getClient();
        client.getWorkItemType(VSS.getWebContext().project.name, "Test case").then(function (data) {
            var d = [{ name: "Priority", children: [{ name: "1" }, { name: "2" }, { name: "3" }, { name: "4" }] }];

            deferred.resolve(convertToTreeNodes(d));
        });

        return deferred.promise();
    }

    // Converts the source to TreeNodes
    function convertToTreeNodes(items): TreeView.TreeNode[] {
        var a: TreeView.TreeNode[] = [];
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
