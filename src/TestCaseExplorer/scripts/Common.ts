export function getTestResultCellContent(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
    var outcome = this.getColumnValue(dataIndex, column.index);
    var d = $("<div class='grid-cell'/>").width(column.width || 100)
    var dIcon = $("<div class='testpoint-outcome-shade icon bowtie-icon-small'/>");
    dIcon.addClass(getIconFromTestOutcome(outcome));
    d.append(dIcon);
    var dTxt = $("<span />");
    dTxt.text(outcome);
    d.append(dTxt);
    return d;
}

export function getIconFromTestOutcome(outcome): string {
    var icon: string = "";
    switch (outcome) {
        case "NotApplicable":
            icon = "icon-tfs-tcm-not-applicable";
            break;
        case "Blocked":
            icon = "icon-tfs-tcm-block-test";
            break;
        case "Passed":
            icon = "icon-tfs-build-status-succeeded";
            break;
        case "Failed":
            icon = "icon-tfs-build-status-failed";
            break;
        case "None":
            icon = "icon-tfs-tcm-block-test";
            break;
        case "DynamicTestSuite":
            icon = "icon-tfs-build-status-succeeded";
            break
    }
    return icon;
}

export interface ICustomColumnDef {
    field: string;
    name: string;
    width: number;
    getCellContents?: any;
}