exports.verify = function (context, expect) {
    var rootNode = context.rootNode;
    var selectNode = rootNode.querySelector('select');
    expect(selectNode.selectedIndex).to.equal(0);
    expect(selectNode.firstElementChild.selected).to.equal(true);
};
