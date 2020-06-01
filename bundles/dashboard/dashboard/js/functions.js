// Main Functions

// todo: for the inputs, make them their own classes
// todo: make helper hashmap for types (text/number vs. radio/checkbox vs. dropdown)\

class DashboardForm {

  constructor(fieldGroup) {
    this.name = fieldGroup;
    this.fields = fieldGroups[fieldGroup].fields;
    this.replicant;
    this.replicantValues;
    this.dashboardFields = [];
    this.generateForm();
  };

  generateForm = () => {
    this.replicant = nodecg.Replicant("fieldValues");
    const { name, namespace } = this.replicant;

    nodecg.readReplicant(name, namespace, replicantValues => {
      this.replicantValues = replicantValues;
      this.fields.forEach(field => {
        const dashboardField = this.createDashboardField({field});
        const brClear = $("<br>", { clear: "all" });
        $("#" + this.name + "Fields").append(dashboardField.dashboardField, brClear, "<br>");
      });
      if (this.name === "playerInfo") this.createPlayerTable();
    });
    this.createSaveButton();
  };

  createDashboardField = ({
    field,
    playerField = false,
    playerNumber
  }) => {
    const sanitizedFieldName = (!!playerField ? "player" + playerNumber + "_" : "") + sanitize(field.fieldName);
    const value = (this.replicantValues[this.name] ? this.replicantValues[this.name][sanitizedFieldName] : "");
    const parent = this;
    const dashboardField = new DashboardField({parent, playerField, sanitizedFieldName, value, ...field});
    this.dashboardFields.push(dashboardField);
    return dashboardField;
  };

  createPlayerTable = () => {
    var maxPlayers = Math.max.apply(null, fieldGroups.playerInfo.fields.find(field => field.fieldName === "# of Players").options);
    var players = new Array(maxPlayers + 1).fill(x => x).map((x,i) => i);
    var playerTable = $("<table>", { id: "playerTable" });

    players.forEach(playerNumber => {
      var row = $("<tr>", { class: "playerRow row" + playerNumber }).append(
        !playerNumber ? $("<th>", { text: "P#" }) : $("<td>", { text: playerNumber })
      );

      fieldGroups.individualPlayerInfo.fields.forEach(field => {
        const { fieldName } = field;
        if (!playerNumber) {
          row.append( $("<th>", { text: fieldName }) );
        } else {
          const playerField = true;
          var dashboardField = this.createDashboardField({field, playerField, playerNumber});
          row.append(dashboardField.dashboardField);
          this.dashboardFields.push(dashboardField);
        };
      });
      if (!!playerNumber) this.generateMoveButtons(playerNumber, maxPlayers).forEach(button => row.append(button));
      playerTable.append(row);
    });
    $("#playerFields").append(playerTable);
    $("input[name$=numberOfPlayers]").each((i,x) => {
        $(x).click(() => this.updatePlayerFields(x.id));
    });
    const numberOfPlayers = this.replicantValues[this.name] ? this.replicantValues[this.name]["numberOfPlayers"] || 1 : 1;
    this.updatePlayerFields(numberOfPlayers);
  };

  generateMoveButtons = (playerNumber, maxPlayers) => {
    var up = $("<td>");
    var down = $("<td>");
    var clear = $("<td>", {
      text: "X",
      class: "moveButton",
      click: () => { this.changeValues(playerNumber, "off") }
    });

    playerNumber = parseInt(playerNumber, 10);
    maxPlayers = parseInt(maxPlayers, 10);

    if (playerNumber > 1) {
      up = $("<td>", {
        text: "↑",
        class: "moveButton",
        click: () => { this.changeValues(playerNumber, "up") }
      });
    };
    if (playerNumber < maxPlayers) {
      down = $("<td>", {
        text: "↓",
        class: "moveButton",
        click: () => { this.changeValues(playerNumber, "down") }
      });
    };
    return [up, down, clear];
  };

  changeValues = (playerNumber, changeType) => {
    var operator = (changeType === "up" ? -1 : 1);
    if (changeType === "off") {
      const confirm = window.confirm("Are you sure you want to clear out player " + playerNumber + "'s info?");
      if (!confirm) return;
    };

    fieldGroups.individualPlayerInfo.fields.forEach(({fieldName, type}) => {
      var sanitizedFieldName = sanitize(fieldName);
      var field1 = $("#player" + playerNumber + "_" + sanitizedFieldName);
      if (changeType === "off") {
        if (type === "text") {
          field1.val("");
          field1.blur();
        } else if (type === "slider") {
          if (field1.is(":checked")) field1.click();
        };
      } else {
        var field2 = $("#player" + (playerNumber + 1*operator) + "_" + sanitizedFieldName);

        if (type === "text") {
          var tmpValue = field1.val();
          field1.val( field2.val() );
          field2.val(tmpValue);
          field1.blur();
          field2.blur();
        } else if (type === "slider") {
          if (field1.is(":checked") !== field2.is(":checked")) {
            field1.click();
            field2.click();
          };
        };
      };
    });
  };

  updatePlayerFields = (numberOfPlayers) => {
    var playersChosen = parseInt(numberOfPlayers, 10);

    $(".playerRow").each((i,playerRow) => {
        var player = parseInt( playerRow.className.match(/\d+/)[0] );
        if (playersChosen < player) {
          $(playerRow).children().slice(1).each((j, field) => {
              $(field).addClass("disabled");
          });
        } else {
          $(playerRow).children().slice(1).each((j, field) => {
              $(field).removeClass("disabled");
          });
        };
    });
  };

  createSaveButton = (all = false) => {
    // todo: make "all panels" type (if can be done, seems like nodecg panels can't share info, which seems to be confirmed by the official docs)
    if (all) {

    } else {
      var button = $("<button>", {
        text: "Save " + fieldGroups[this.name].name,
        class: "saveButton",
        click: (e) => {
          e.preventDefault();
          this.dashboardFields.forEach(({sanitizedFieldName, value}) => {
            this.replicantValues[this.name][sanitizedFieldName] = value;
          });
          const { name, namespace } = this.replicant;
          // todo: make a replicant cleanup, aka if a field in fieldGroups.json doesn't exist, remove it from the replicant
          // example from before: delete(this.replicantValues.playerInfo[1])
          nodecg.readReplicant(name, namespace, replicantValues => {
            var newValues = {...replicantValues, ...{[this.name]: this.replicantValues[this.name]}}
            if (this.name === "mainInfo") {
              this.replicantValues.mainInfo.gameNameTitle = this.replicantValues.mainInfo.gameName.replace(/\bI Wanna |\bBe the /gi, "");
            }
            this.replicant.value = this.replicantValues = newValues;
          });
          $(e.target).removeClass("saveChanges");
        }
      });
    };

    $("#" + this.name + "Save").append(button);
  };

};

class DashboardField {

  constructor({
    parent,
    dataOff,
    dataOn,
    defaultValue,
    fieldName,
    options,
    optional,
    placeholder,
    playerField,
    replicantValues,
    sanitizedFieldName,
    type,
    value
  }) {
    this.parent = parent;
    this.dataOff = dataOff || "No";
    this.dataOn = dataOn || "Yes";
    this.defaultValue = defaultValue;
    this.fieldName = fieldName;
    this.options = options;
    this.optional = optional;
    this.placeholder = placeholder;
    this.playerField = playerField;
    this.sanitizedFieldName = sanitizedFieldName;
    this.type = type;
    this.value = value || "";

    this.dashboardField;
    this.id;
    this.createDashboardField();
  };

  createDashboardField = () => {
    const fieldTag = ( this.playerField ? "Td" : "Div" );
    this.id = this.sanitizedFieldName;
    this.dashboardField = $("<" + fieldTag + ">", { id: this.id + fieldTag });
    var label = $("<label>", { text: this.fieldName });
    if (this.optional) label[0].innerHTML += "<i class='smallLabel'> (optional)</i>";
    var input;

    switch(this.type) {
      case "text":
      case "number":
        input = this.createTextBox();
        break;
      case "radio":
      case "checkbox":
        input = this.createSelectGroup();
        break;
      case "slider":
        input = this.createSlider();
        break;
      case "dropdown":
        input = this.createDropdown();
        break;
      default: ""; break;
    };
    if (this.playerField) {
      this.dashboardField.append( input );
    } else {
      this.dashboardField.append(label, "<br>", input);
    };
  };

  toggleSaveChangesOn = () => {
    $("#" + this.parent.name + "Save > button").addClass("saveChanges");
    // debugger
    // $("#adminPanelSave > button").addClass("saveChanges");
    $("#loadLayoutButton").addClass("disabled");
  }

  // create fields below

  createTextBox = () => {
    // console.log(this.replicantValues)
    return $("<input>", {
      id: this.id,
      value: this.value,
      type: this.type,
      placeholder: this.placeholder || "",
      blur: () => {
        this.value = $("#" + this.id).val();
        this.toggleSaveChangesOn();
      }
    });
  };

  createSelectGroup = () => {
    var group = $("<div class='" + this.type + "-group'>", { id: this.idFieldName + "Group" });

    const maxLength = Math.max.apply(null, [...this.options.map(x => x.toString().length)]);
    var columns = Math.floor(31 / maxLength); // with Courier New, Courier, monospace, 32 max fits in 2 wide
    if (columns > 6) columns = 6;
    const width = (100 / columns) - 2 + "%";
    // console.log(options, maxLength, columns, width)

    var values = this.value.split("; ");
    if (values === "" && this.defaultValue) values = this.defaultValue;

    this.options.forEach((text, i) => {
      var id = sanitize(text);

      const select = $("<input>", {
        width: width,
        type: this.type,
        id: id,
        name: this.id,
        value: text,
        checked: values.includes(text),
        click: () => {
          var choices = [];
          $("input[name$='" + this.id + "']").filter((i,input) => $(input).is(":checked")).each((i,x) => choices.push(x.value));
          this.value = choices.join("; ");
          this.toggleSaveChangesOn();
        }
      });
      const label = $("<label>", {
        width: width,
        for: id,
        text: text,
      });
      group.append(select, label);
    });
    return group;
  };

  createSlider = () => {
    var slider = $("<label>", { class: "switch" })
      .append(
        $("<input>", {
          type: "checkbox",
          id: this.id,
          checked: !!this.value,
          change: () => {
            this.value = $("#" + this.id).is(":checked");
            this.toggleSaveChangesOn();
          }
        })
      );
    var onOff = $("<div>", { class: "slider round" })
      .append(
        $("<span>", {
          class: "on",
          text: this.dataOn
        })
      ).append(
        $("<span>", {
          class: "off",
          text: this.dataOff
        })
      );
    slider.append(onOff);
    return slider;
  };

  createDropdown = () => { // note: untested
    var dropdown = $("<select>", {
      id: this.id
    });
    // this.toggleSaveChangesOn();
    this.options.forEach(text => {
      var option = $("<option>", {
        value: sanitize(text),
        text: text,
        // click: () => {  } // todo: implement this
      });
      dropdown.append(option);
    });

    return dropdown;
  };

};

const setLoadLayoutInfo = () => {
  const text = "Layout window for";
  const newId = "Open New Window";

  $("#loadLayout").append(
    $("<div>", {
      id: sanitize(text),
      class: "loadButton",
      text: text
    })
  );

  $("#loadLayout").append(
    $("<button>", {
      id: sanitize(newId) + "Window",
      class: "loadButton",
      text: newId
    })
  );

  const replicant = nodecg.Replicant("fieldValues");

  replicant.on("change", (newValue, oldValue) => {
    const numberOfPlayers = newValue["playerInfo"]["numberOfPlayers"];
    const { resolution, gameNameTitle } = newValue["mainInfo"];
    const labelText = text + "<br>" + numberOfPlayers + "P " + resolution + " - " + gameNameTitle;

    $("#" + sanitize(text)).html(labelText);
    $("#" + sanitize(newId) + "Window").on("click", (e) => {
      e.preventDefault();
      if (numberOfPlayers !== "N/A" && resolution !== "N/A") {
        var url = "http://localhost:9090/bundles/dashboard/graphics/layout.html";
        window.open(url);
      };
    });
  });
};
