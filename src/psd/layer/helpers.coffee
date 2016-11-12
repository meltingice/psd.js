module.exports =
  isFolder: ->
    if @adjustments['sectionDivider']?
      @adjustments['sectionDivider'].isFolder
    else if @adjustments['nestedSectionDivider']?
      @adjustments['nestedSectionDivider'].isFolder
    else
      @name is "<Layer group>"

  isFolderEnd: ->
    if @adjustments['sectionDivider']?
      @adjustments['sectionDivider'].isHidden
    else if @adjustments['nestedSectionDivider']?
      @adjustments['nestedSectionDivider'].isHidden
    else
      @name is "</Layer group>"