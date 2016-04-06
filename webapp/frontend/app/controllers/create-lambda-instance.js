import Ember from "ember";

export default Ember.Controller.extend({
  selectedProjectName: null,
  selectedProjectVMs: null,
  selectedProjectCPUs: null,
  selectedProjectRAM: [],
  selectedProjectDisk: [],

  selectedNumberOfSlaves: null,
  selectedMasterNodeCPUs: null,
  selectedSlaveNodeCPUs: null,
  selectedMasterNodeRAM: null,
  selectedSlaveNodeRAM: null,
  selectedMasterNodeDisk: null,
  selectedSlaveNodeDisk: null,

  masterNodeCPUValues: [],
  slaveNodeCPUValues: [],
  masterNodeRAMValues: [],
  slaveNodeRAMValues: [],
  masterNodeDiskValues: [],
  slaveNodeDiskValues: [],

  minQuotasPerVM: {'cpus': 2, 'ram': 2048, 'disk': 10},
  minQuotasPerProject: {
    'vms': 2,
    'cpus': 4,
    'ram': {'bytes': 4294967296, 'megaBytes': 4096},
    'disk': {'bytes': 21474836480, 'gigaBytes': 20},
    'floatingIPs': 1,
    'privateNetworks': 1
  },

  enoughQuotas: false,

  submitButtonDisabled: false,

  masterCPUsSelectDisabled: false,
  masterRAMSelectDisabled: false,
  masterDiskSelectDisabled: false,

  slaveCPUsSelectDisabled: false,
  slaveRAMSelectDisabled: false,
  slaveDiskSelectDisabled: false,

  kafkaInputTopics: ["input"],
  kafkaOutputTopics: ["batch-output", "stream-output"],
  conflictingKafkaTopics: false,
  kafkaTopicsValidityReported: false,
  kafkaTopicsConflictMessage: "Using the same name for input and output topic will result only in input topic creation!",

  actions: {
    saveLambdaInstance: function(newLambdaInstance){
      newLambdaInstance.set('instanceName', this.get('instanceName'));
      newLambdaInstance.set('masterName', this.get('masterName'));

      newLambdaInstance.set('slaves', Ember.$("input[name='slaves']")[0].value);

      newLambdaInstance.set('projectName', Ember.$("select[name='okeanos_project']")[0].value);
      newLambdaInstance.set('VCPUsMaster', Ember.$("select[name='vcpus_master']")[0].value);
      newLambdaInstance.set('VCPUsSlave', Ember.$("select[name='vcpus_slave']")[0].value);
      newLambdaInstance.set('RamMaster', Ember.$("select[name='ram_master']")[0].value);
      newLambdaInstance.set('RamSlave', Ember.$("select[name='ram_slave']")[0].value);
      newLambdaInstance.set('DiskMaster', Ember.$("select[name='disk_master']")[0].value);
      newLambdaInstance.set('DiskSlave', Ember.$("select[name='disk_slave']")[0].value);

      var requestedPublicKeys = [];
      var options = Ember.$("select[name='public_key_name']")[0].options;
      for(var i = 0;i < options.length;i++){
        if(options[i].selected){
          requestedPublicKeys.push(options[i].value);
        }
      }
      newLambdaInstance.set('publicKeyName', requestedPublicKeys);

      newLambdaInstance.set('kafkaInputTopics', this.get('kafkaInputTopics'));
      newLambdaInstance.set('kafkaOutputTopics', this.get('kafkaOutputTopics'));

      var self = this;
      newLambdaInstance.save().then(function(){
        self.transitionToRoute('lambda-instance', newLambdaInstance.get('id')).catch(function() {
          self.transitionToRoute('lambda-instances.index').then(function(newRoute) {
            newRoute.controller.set('message', 'Your lambda instance creation will begin shortly.');
            newRoute.controller.set('request', true);
            newRoute.controller.send('start_stop');
          });
        });
      });
    },

    selectFromDropDownList: function(variable, event){
      if(variable === "selectedProjectName"){
        this.set(variable, event.target.value);
      }
      else{
        this.set(variable, parseInt(event.target.value));
      }

      this.calculateDropDownListValues();
    }
  },

  calculateDropDownListValues: function(){
    var model = this.get('model');

    // Get the quotas of the selected project. Each project inside the model has the minimum
    // quotas needed for the creation of a Lambda Instance since those that didn't, were removed
    // from the router.
    var selectedProjectName = this.get('selectedProjectName');
    for(var i = 0, n = model.userOkeanosProjects.get('length');i < n;i++){
      var currentProject = model.userOkeanosProjects.objectAt(i);

      if(currentProject.get('name').localeCompare(selectedProjectName) === 0){
        this.set('selectedProjectVMs', currentProject.get('vm'));
        this.set('selectedProjectCPUs', currentProject.get('cpu'));
        this.set('selectedProjectRAM', {'megaBytes': currentProject.get('ram') / 1048576});
        this.set('selectedProjectDisk', {'gigaBytes': currentProject.get('disk') / 1073741824});

        break;
      }
    }

    // Set the selected number of slaves to a proper value.
    if(this.get('selectedNumberOfSlaves') <= 0){
      this.set('selectedNumberOfSlaves', 1);
    }
    else if(this.get('selectedNumberOfSlaves') >= this.get('selectedProjectVMs')){
      this.set('selectedNumberOfSlaves', this.get('selectedProjectVMs') - 1);
    }

    var selectedNumberOfSlaves = this.get('selectedNumberOfSlaves');

    var masterNodeCPUValues  = this.get('masterNodeCPUValues');
    var slaveNodeCPUValues   = this.get('slaveNodeCPUValues');
    var masterNodeRAMValues  = this.get('masterNodeRAMValues');
    var slaveNodeRAMValues   = this.get('slaveNodeRAMValues');
    var masterNodeDiskValues = this.get('masterNodeDiskValues');
    var slaveNodeDiskValues  = this.get('slaveNodeDiskValues');

    var availableCPUs = this.get('selectedProjectCPUs');
    var availableRAM = this.get('selectedProjectRAM')['megaBytes'];
    var availableDisk = this.get('selectedProjectDisk')['gigaBytes'];

    var leastCPUsForSlaves = selectedNumberOfSlaves * slaveNodeCPUValues.objectAt(0).get('value');
    var leastRAMForSlaves = selectedNumberOfSlaves * slaveNodeRAMValues.objectAt(0).get('value');
    var leastDiskForSlaves = selectedNumberOfSlaves * slaveNodeDiskValues.objectAt(0).get('value');

    var maxCPUsForMaster = availableCPUs - leastCPUsForSlaves;
    var maxRAMForMaster = availableRAM - leastRAMForSlaves;
    var maxDiskForMaster = availableDisk - leastDiskForSlaves;

    var controller = this;

    masterNodeCPUValues.forEach(function(item){
      item.set('enabled', item.get('value') <= maxCPUsForMaster);

      // Check if the selectedMasterNodeCPUs value has become disabled.
      if(item.get('value') === controller.get('selectedMasterNodeCPUs') && !item.get('enabled')){
        controller.set('selectedMasterNodeCPUs', masterNodeCPUValues[0]['value']);
      }
    });
    if(masterNodeCPUValues.isEvery('enabled', false)){
      this.set('masterCPUsSelectDisabled', true);
      Ember.run.schedule('render', function task(){
        Ember.$("select[name='vcpus_master']")[0].selectedIndex = -1;
      });
    }
    else{
      if(this.get('masterCPUsSelectDisabled')){
        Ember.run.schedule('render', function task(){
          Ember.$("select[name='vcpus_master']")[0].selectedIndex = 0;
        });
      }
      this.set('masterCPUsSelectDisabled', false);
    }

    masterNodeRAMValues.forEach(function(item){
      item.set('enabled', item.get('value') <= maxRAMForMaster);

      // Check if the selectedMasterNodeRAM value has become disabled.
      if(item.get('value') === controller.get('selectedMasterNodeRAM') && !item.get('enabled')){
        controller.set('selectedMasterNodeRAM', masterNodeRAMValues[0]['value']);
      }
    });
    if(masterNodeRAMValues.isEvery('enabled', false)){
      this.set('masterRAMSelectDisabled', true);
      Ember.run.schedule('render', function task(){
        Ember.$("select[name='ram_master']")[0].selectedIndex = -1;
      });
    }
    else{
      if(this.get('masterRAMSelectDisabled')){
        Ember.run.schedule('render', function task(){
          Ember.$("select[name='ram_master']")[0].selectedIndex = 0;
        });
      }
      this.set('masterRAMSelectDisabled', false);
    }

    masterNodeDiskValues.forEach(function(item){
      item.set('enabled', item.get('value') <= maxDiskForMaster);

      // Check if the selectedMasterNodeDisk value has become disabled.
      if(item.get('value') === controller.get('selectedMasterNodeDisk') && !item.get('enabled')){
        controller.set('selectedMasterNodeDisk', masterNodeDiskValues[0]['value']);
      }
    });
    if(masterNodeDiskValues.isEvery('enabled', false)){
      this.set('masterDiskSelectDisabled', true);
      Ember.run.schedule('render', function task(){
        Ember.$("select[name='disk_master']")[0].selectedIndex = -1;
      });
    }
    else{
      if(this.get('masterDiskSelectDisabled')){
        Ember.run.schedule('render', function task(){
          Ember.$("select[name='disk_master']")[0].selectedIndex = 0;
        });
      }
      this.set('masterDiskSelectDisabled', false);
    }

    var maxCPUsForSlave = (availableCPUs - this.get('selectedMasterNodeCPUs')) / selectedNumberOfSlaves;
    var maxRAMForSlave = (availableRAM - this.get('selectedMasterNodeRAM')) / selectedNumberOfSlaves;
    var maxDiskForSlave = (availableDisk - this.get('selectedMasterNodeDisk')) / selectedNumberOfSlaves;

    slaveNodeCPUValues.forEach(function(item){
      item.set('enabled', item.get('value') <= maxCPUsForSlave);

      // Check if the selectedSlaveNodeCPUs value has becomed disabled.
      if(item.get('value') === controller.get('selectedSlaveNodeCPUs') && !item.get('enabled')){
        controller.set('selectedSlaveNodeCPUs', slaveNodeCPUValues[0]['value']);
      }
    });
    if(slaveNodeCPUValues.isEvery('enabled', false)){
      this.set('slaveCPUsSelectDisabled', true);
      Ember.run.schedule('render', function task(){
        Ember.$("select[name='vcpus_slave']")[0].selectedIndex = -1;
      });
    }
    else{
      if(this.get('slaveCPUsSelectDisabled')){
        Ember.run.schedule('render', function task(){
          Ember.$("select[name='vcpus_slave']")[0].selectedIndex = 0;
        });
      }
      this.set('slaveCPUsSelectDisabled', false);

    }

    slaveNodeRAMValues.forEach(function(item){
      item.set('enabled', item.get('value') <= maxRAMForSlave);

      // Check if the selectedSlaveNodeRAM value has becomed disabled.
      if(item.get('value') === controller.get('selectedSlaveNodeRAM') && !item.get('enabled')){
        controller.set('selectedSlaveNodeRAM', slaveNodeRAMValues[0]['value']);
      }
    });
    if(slaveNodeRAMValues.isEvery('enabled', false)){
      this.set('slaveRAMSelectDisabled', true);
      Ember.run.schedule('render', function task(){
        Ember.$("select[name='ram_slave']")[0].selectedIndex = -1;
      });
    }
    else{
      if(this.get('slaveRAMSelectDisabled')){
        Ember.run.schedule('render', function task(){
          Ember.$("select[name='ram_slave']")[0].selectedIndex = 0;
        });
      }
      this.set('slaveRAMSelectDisabled', false);
    }

    slaveNodeDiskValues.forEach(function(item){
      item.set('enabled', item.get('value') <= maxDiskForSlave);

      // Check if the selectedSlaveNodeDisk value has become disabled.
      if(item.get('value') === controller.get('selectedSlaveNodeDisk') && !item.get('enabled')){
        controller.set('selectedSlaveNodeDisk', slaveNodeDiskValues[0]['value']);
      }
    });
    if(slaveNodeDiskValues.isEvery('enabled', false)){
      this.set('slaveDiskSelectDisabled', true);
      Ember.run.schedule('render', function task(){
        Ember.$("select[name='disk_slave']")[0].selectedIndex = -1;
      });
    }
    else{
      if(this.get('slaveDiskSelectDisabled')){
        Ember.run.schedule('render', function task(){
          Ember.$("select[name='disk_slave']")[0].selectedIndex = 0;
        });
      }
      this.set('slaveDiskSelectDisabled', false);
    }

    this.set('submitButtonDisabled', (
      this.get('masterCPUsSelectDisabled') || this.get('masterRAMSelectDisabled') ||
      this.get('masterDiskSelectDisabled') || this.get('slaveCPUsSelectDisabled') ||
      this.get('slaveRAMSelectDisabled') || this.get('slaveDiskSelectDisabled')
      )
    );
  },

  kafkaInputTopicsObserver: Ember.observer('kafkaInputTopics', function() {
    if(this.get('kafkaInputTopics').get('length') === 0){
      // The observer will fire again after this change. Return so that parseKafkaTopics
      // is only called once from the upcoming observer firing
      this.set('kafkaInputTopics', ["input"]);

      return;
    }

    this.parseKafkaTopics();
  }),

  kafkaOutputTopicsObserver: Ember.observer('kafkaOutputTopics', function() {
    if(this.get('kafkaOutputTopics').get('length') === 0){
      // The observer will fire again after this change. Return so that parseKafkaTopics
      // is only called once from the upcoming observer firing
      this.set('kafkaOutputTopics', ["batch-output", "stream-output"]);

      return;
    }

    this.parseKafkaTopics();
  }),

  parseKafkaTopics: function(){
    // In case this method has been called due to a change in kafkaInputTopics or kafkaOutputTopics
    // from inside the route, then these elements will be undefined since the HTML hasn't yet been
    // rendered.
    var inputTopicsElement = Ember.$('#kafka-input-topics #kafka-input-topics-tokenfield')[0];
    var outputTopicsElement = Ember.$('#kafka-output-topics #kafka-output-topics-tokenfield')[0];

    var kafkaInputTopics = this.get('kafkaInputTopics');
    var kafkaOutputTopics = this.get('kafkaOutputTopics');

    for (var i = 0, n = kafkaInputTopics.get('length');i < n;i++) {
      for (var j = 0, m = kafkaOutputTopics.get('length'); j < m;j++) {
        if (kafkaInputTopics.objectAt(i) === kafkaOutputTopics.objectAt(j)) {
          this.set('conflictingKafkaTopics', true);

          if(!this.get('kafkaTopicsValidityReported')){
            if(inputTopicsElement !== undefined && outputTopicsElement !== undefined){
              inputTopicsElement.setCustomValidity(this.get('kafkaTopicsConflictMessage'));
              outputTopicsElement.setCustomValidity(this.get('kafkaTopicsConflictMessage'));

              // Some browsers (e.g. Firefox) haven't yet implemented the "reportValidity" API.
              // https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/reportValidity
              try{
                inputTopicsElement.reportValidity();
                outputTopicsElement.reportValidity();
              }
              catch(error){
                console.log("Logging caught error: " + error);
              }

              this.set('kafkaTopicsValidityReported', true);
            }
          }

          return;
        }
      }
    }

    this.set('conflictingKafkaTopics', false);
    if(this.get('kafkaTopicsValidityReported')){
      if(inputTopicsElement !== undefined && outputTopicsElement !== undefined){
        inputTopicsElement.setCustomValidity("");
        outputTopicsElement.setCustomValidity("");

        this.set('kafkaTopicsValidityReported', false);
      }
    }
  }

});
