window.onload = function() {
    new Visualizer().ini();
};
var Visualizer = function() {
    this.file = null, //the current file
    this.fileName = null, //the current file name
    this.audioContext = null,
    this.source = null, //the audio source
    this.status = 0, //1 for playing and 0 for stoped
    this.info = document.getElementById('info').innerHTML //this used to upgrade the UI information
}
Visualizer.prototype = {
    ini: function() {
        this._prepareAPI();
        this._addEventListner();
    },
    _prepareAPI: function() {
        //fix browser vender for AudioContext and requestAnimationFrame
        window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
        window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
        try {
            this.audioContext = new AudioContext();
        } catch (e) {
            document.getElementById('!Your browser does not support AudioContext');
            console.log(e);
        }
    },
    _addEventListner: function() {
        var that = this,
            audioInput = document.getElementById('uploadedFile'),
            infoBar = document.getElementById('info'),
            dropContainer = document.getElementsByTagName("body")[0];
        //listen the file upload
        audioInput.onchange = function() {
            //the if statement fixes the file selction cancle, because the onchange will trigger even the file selection been canceled
            if (audioInput.files.length !== 0) {
                //only process the first file
                that.file = audioInput.files[0];
                that.fileName = that.file.name;
                //once the file is ready,start the visualizer
                that._start();
                infoBar.innerHTML = 'Uploading...';
            };
        };
        //listen the drag & drop
        dropContainer.addEventListener("dragenter", function() {
            infoBar.innerHTML = 'Drop it on the page...';
        }, false);
        dropContainer.addEventListener("dragover", function(e) {
            e.stopPropagation();
            e.preventDefault();
            //set the drop mode
            e.dataTransfer.dropEffect = 'copy';
        }, false);
        dropContainer.addEventListener("dragleave", function() {
            document.getElementById('info').innerHTML = that.info;
        }, false);
        dropContainer.addEventListener("drop", function(e) {
            e.stopPropagation();
            e.preventDefault();
            document.getElementById('info').innerHTML = 'Uploading...';
            //get the dropped file
            that.file = e.dataTransfer.files[0];
            that.fileName = that.file.name;
            //once the file is ready,start the visualizer
            that._start();
        }, false);
    },
    _start: function() {
        //read and decode the file into audio array buffer 
        var that = this,
            file = this.file,
            fr = new FileReader();
        fr.onload = function(e) {
            var fileResult = e.target.result;
            var audioContext = that.audioContext;
            if (audioContext === null) {
                return
            };
            audioContext.decodeAudioData(fileResult, function(buffer) {
                that._visualize(audioContext, buffer);
            }, function(e) {
                document.getElementById('info').innerHTML = '!Fail to decode the file';
                console.log(e);
            });
        };
        fr.onerror = function(e) {
            document.getElementById('info').innerHTML = '!Fail to read the file';
            console.log(e);
        };
        //assign the file to the reader
        fr.readAsArrayBuffer(file);
    },
    _visualize: function(audioContext, buffer) {
        var audioBufferSouceNode = audioContext.createBufferSource(),
            analyser = audioContext.createAnalyser();
        audioBufferSouceNode.loop = true;
        //connect the source to the analyser
        audioBufferSouceNode.connect(analyser);
        //connect the analyser to the destination(the speaker), or we won't hear the sound
        analyser.connect(audioContext.destination);
        //then assign the buffer to the buffer source node
        audioBufferSouceNode.buffer = buffer;
        //play the source
        if (!audioBufferSouceNode.start) {
            audioBufferSouceNode.start = audioBufferSouceNode.noteOn //in old browsers use noteOn method
            audioBufferSouceNode.stop = audioBufferSouceNode.noteOff //in old browsers use noteOn method
        };
        audioBufferSouceNode.start(0);
        this.status = 1;
        //stop the previous sound if any
        if (this.source !== null) this.source.stop(0);
        this.source = audioBufferSouceNode;
        this.info = document.getElementById('info').innerHTML = 'Playing ' + this.fileName;
        document.getElementById('fileWrapper').style.opacity = 0.2;
        this._drawSpectrum(analyser);
    },
    _drawSpectrum: function(analyser) {
        var canvas = document.getElementById('canvas'),
            cwidth = canvas.width,
            cheight = canvas.height,
            meterWidth = 10, //width of the meters in the spectrum
            gap = 2, //gap between meters
            meterNum = 800 / (10 + 2); //count of the meters
        ctx = canvas.getContext('2d'),
        gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(1, '#0f0');
        gradient.addColorStop(0.5, '#ff0');
        gradient.addColorStop(0, '#f00');
        ctx.fillStyle = gradient; //set the filllStyle to gradient for a better look
        var drawMeter = function() {
            var array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            var step = Math.round(array.length / meterNum); //sample from the total array
            ctx.clearRect(0, 0, cwidth, cheight);
            for (var i = 0; i < meterNum; i++) {
                var value = array[i * step];
                ctx.fillRect(i * 12 /*meterWidth+gap*/ , cheight - value, meterWidth, cheight);
            }
            requestAnimationFrame(drawMeter);
        }
        requestAnimationFrame(drawMeter);
    }
}