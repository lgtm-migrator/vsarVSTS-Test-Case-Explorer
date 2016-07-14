//---------------------------------------------------------------------
// <copyright file="ColumnsOptionsView.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
//    This is part of the Test Case Explorer extensions
//    from the ALM Rangers. This file contains the implementation
//    of the column options dialog.
// </summary>
//---------------------------------------------------------------------

import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import Dialogs = require("VSS/Controls/Dialogs");
import WorkItemContracts = require("TFS/WorkItemTracking/Contracts");
import WorkItemClient = require("TFS/WorkItemTracking/RestClient");
import TestClient = require("TFS/TestManagement/RestClient");
import TestContracts = require("TFS/TestManagement/Contracts");
import DetailsToggle = require("scripts/DetailsToggle");
import Navigation = require("VSS/Controls/Navigation");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import CoreUtils = require("VSS/Utils/Core");
import CtrlCombos = require("VSS/Controls/Combos");
import WorkItemServices = require("TFS/WorkItemTracking/Services");
import TestCaseDataService = require("scripts/TestCaseDataService");
import Common = require("scripts/Common");

export interface TestCaseViewSelectedCallback { (value: string): void }

export class ColumnOptionsView {

    public _avaibleFields //: WorkItemContracts.WorkItemFieldReference[];
    public _selectedColumns: Common.ICustomColumnDef[];

    private lstAvailbleFields: any;;
    private lstSelectedColumns: any
    private content;

    public Init(content, selectedColumns: Common.ICustomColumnDef[]) {
        var view = this;
        view.content = content;
        view._selectedColumns = selectedColumns;

        var witClient = WorkItemClient.getClient();
        var ctx = VSS.getWebContext();

        witClient.getWorkItemType(ctx.project.id, Common.WIQLConstants.getWiqlConstants().TestCaseTypeName).then(
            wit => {
                view._avaibleFields = wit["fieldInstances"]; 
                view.setupAvailbleGrid();
            },
            err=> {
            }
        );
        this.setupSelectedColumnsGrid();
        this.setupMoveButtons();
        this.setupSortButtons();
    }

    public GetSelectedColumns(): Common.ICustomColumnDef[] {
        var lst: Common.ICustomColumnDef[] = [];
        this.lstSelectedColumns.find('option').each(function (i, o) {
            var orgText = $(o).text();
            var refName = $(o).val();
            var width: number = parseInt($(o).attr("columnWidth"));
            orgText = orgText.substring(0, orgText.indexOf("[") -1);
            lst.push({
                name: orgText, field: refName, width: width
            });

            });
        return lst;
    }
    private setupAvailbleGrid() {
        var view = this;
        view.lstAvailbleFields= this.content.find('#lst-column-source')

        view._avaibleFields.forEach(
            f=> {
                if (this._selectedColumns.filter(c=> {
                    return c.field == f.referenceName;
                }).length == 0) {
                    this.lstAvailbleFields.append($('<option>').val(f.referenceName).text(f.name));
                }
            });
        view.lstAvailbleFields.on("dblclick", e=> { view.addColumn() }); 
            
        this.sortSelectOptions();
    }

    private setupSelectedColumnsGrid() {
        var view = this;
     
        this.lstSelectedColumns = this.content.find('#lst-selected-columns')
        this._selectedColumns.forEach(
            f=> {
                view.lstSelectedColumns.append($('<option>').val(f.field).text(f.name + " [" + f.width + "]").attr("columnWidth", f.width));
            });
        
        view.lstSelectedColumns.on("dblclick", e=> { view.removeColumn() }); 

        this.lstSelectedColumns.change(e=> {

            view.lstSelectedColumns.find(':selected').each(function (i, o) {
                if ($(o).prev() != null) {
                    view.content.find("#cmdUp").prop('disabled', false);;
                }
                else {
                    view.content.find("#cmdUp").prop('disabled', true);;
                }
                if ($(o).next() != null) {
                    view.content.find("#cmdDown").prop('disabled', false);;;
                }
                else {
                    view.content.find("#cmdDown").prop('disabled', true);;
                }

                var width = $(this).attr("columnWidth");
                view.content.find('#column-width').val(width);
            });
        });
        
        view.content.find('#column-width').change(e=> {
            var width = view.content.find('#column-width').val();

            view.lstSelectedColumns.find(':selected').each(function (i, selected) {
                if (i === 0) {
                    var orgText = $(selected).text();
                    var refName = $(selected).val();
            
                    orgText = orgText.substring(0, orgText.indexOf("[") + 1);

                    view.lstSelectedColumns.find("option:eq(" + $(selected).index() + ")").replaceWith(
                        $('<option>')
                            .val(refName)
                            .text(orgText + width + "]")
                            .attr("columnWidth", width)                     
                    );
                }
            });

            var o: HTMLSelectElement = view.lstSelectedColumns[0];
            
            var old = view.lstSelectedColumns[0].style.display;
            view.lstSelectedColumns[0].style.display = 'none';
            var foo = view.lstSelectedColumns[0].offsetHeight;
            view.lstSelectedColumns[0].style.display = old;
        });
    }

    private setupMoveButtons() {
        var view = this;
        this.content.find('#cmdAdd').click(e => {
            view.addColumn();   
        });
        
        this.content.find('#cmdRemove').click(e => {
            view.removeColumn();
        });        
    }

    private setupSortButtons() {
        var view = this;
        this.content.find('#cmdUp').click(e => {
            this.moveSelectOptions("up");
        });

        this.content.find('#cmdDown').click(e => {
            this.moveSelectOptions("down");
        });
    }

    private addColumn() {
        var view = this;
        var defWidth = 75;
        
        view.lstAvailbleFields.find(':selected').each(function (i, selected) {
            var txt = $(selected).text();
            var refName = $(selected).val();
            txt = txt + " [" + defWidth + "]";
            view.lstSelectedColumns.append($('<option>').val(refName).text(txt).attr("columnWidth", defWidth));
            view.lstAvailbleFields.find("option:eq(" + $(selected).index() + ")").remove();
        });
    }

    private removeColumn() {
        var view = this;

        view.lstSelectedColumns.find(':selected').each(function (i, selected) {
            var txt = $(selected).text();
            var refName = $(selected).val();

            txt = txt.substring(0, txt.indexOf("[") - 1);

            //Remove old
            view.lstSelectedColumns.find("option:eq(" + $(selected).index() + ")").remove();

            //Add to first list 
            view.lstAvailbleFields.append($('<option>').val(refName).text(txt));

            view.sortSelectOptions();
        });
    }

    private moveSelectOptions(direction: string) {
        var view = this;

        var $op = view.lstSelectedColumns.find(':selected')
        if ($op.length) {
            (direction == 'up') ?
                $op.first().prev().before($op) :
                $op.last().next().after($op);
        }
    }

    private sortSelectOptions(){
        //Sort 
        var view = this;
        var options = [];
        view.lstAvailbleFields.find("option").each(function (i, o) {
            options.push({ t: $(o).text(), v: o.value });
        });
         
        options.sort(function (o1, o2) {
            var t1 = o1.t.toLowerCase(), t2 = o2.t.toLowerCase();

            return t1 > t2 ? 1 : t1 < t2 ? -1 : 0;
        });

        view.lstAvailbleFields.find("option").each(function (i, o) {
            view.lstAvailbleFields.find("option:eq(" + $(o).index() + ")").replaceWith(
                $('<option>')
                    .val(options[i].v)
                    .text(options[i].t)
            );
        });
    }
}

export function Register() {
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
}