/*jslint browser: true, devel: true, nomen: true, unparam: true*/
/*global  FileReader*/

// If running locally using Chrome add argument --allow-file-access-encryptor_module.readerPlainom-files
// --- Code by Lee Tobin leetobin@gmail.compare

var encryptor_module = {

	rows_from_file: [],
	rows_processed: [],
	random_data: null,
	random_data_vn: [],
	inverval_value_average: 0,
	minimum_interval_value: 0,
	readerOTP: new FileReader(),
	readerPlain: new FileReader(),
	im: new Image(),
	plaintext_data: null,
	encrypted_data:null,
	encrypted_data_vn: null,
	image_width: 0,
	image_height: 0,
	fiplainTextme: "",
	imageFile:false,

	init: function () {
		"use strict";

		document.getElementById('files').addEventListener('change', this.handleOTP, false); //OTP
		document.getElementById('fileEnc').addEventListener('change', this.handleFile, false); //Plain Text
		document.getElementById("download_Result").checked = JSON.parse(localStorage.getItem("download_Result"));
		document.getElementById("use_vn").checked = JSON.parse(localStorage.getItem("use_vn"));

		encryptor_module.readerOTP.onerror = function (e) {
			document.getElementById('working').innerHTML = '<i class="fa fa-times"></i>';
		};

		encryptor_module.readerOTP.onloadend = function () {
			encryptor_module.random_data = [];
			var text = encryptor_module.readerOTP.result,
			missingValueCount = 0,
			i,
			line;

			//clear vars
			encryptor_module.rows_from_file = [];
			

			//clear DOM elements
			document.getElementById("encrypted").getContext("2d").clearRect(0, 0, encryptor_module.image_width, encryptor_module.image_height);
			document.getElementById("encrypted_vn").getContext("2d").clearRect(0, 0, encryptor_module.image_width, encryptor_module.image_height);
			document.getElementById("log").innerHTML = "";
			document.getElementById("resultFile").innerHTML = "";

			if (!text.startsWith("* Created by PSpice")) {
				document.getElementById('working').innerHTML = '<i class="fa fa-times"></i>';
				encryptor_module.log("Not a Pspice file!");
				return -1;
			}

			//break into lines
			encryptor_module.rows_from_file = text.match(/^.*((\r\n|\n|\r)|$)/gm);
			
			if (encryptor_module.rows_from_file.length < 10) {
				encryptor_module.log("Too few values, exiting...");
				document.getElementById('working').innerHTML = '<i class="fa fa-times"></i>';
				return -1;
			} //Safety!

			//If it's a PSpice file do the processing etc
			document.getElementById('working').innerHTML = '<i class="fa fa-check"></i>';
			//Grab the OTP
			encryptor_module.process_data();
		}

		encryptor_module.readerPlain.onloadend = function () {
			if(!encryptor_module.random_data || encryptor_module.random_data.length < 10) { 
				encryptor_module.log("Please provide the OTP!");
				return; 
			}
			
			encryptor_module.encrypted_data = [];
			encryptor_module.encrypted_data_vn = [];
			
			if(encryptor_module.imageFile){ 
				encryptor_module.get_image_data();
			}else{
				var result = this.result;
				var hex = "";
				for (var i = 0; i < this.result.length; i++) {
					var byteStr = result.charCodeAt(i).toString(16);
					if (byteStr.length < 2) {
						byteStr = "0" + byteStr;
					}
					hex += byteStr;
				}
				encryptor_module.plaintext_data = hex;
				
				var element = document.getElementById("plainText");
				var c = element.getContext("2d");
				c.clearRect(0, 0, 512, 512);
				c.fillStyle = "blue";
				c.font = "60px Arial";
				c.fillText(hex.slice(0,10) + "...", 0,60);
				
				for (var x = 0; x < encryptor_module.plaintext_data.length; x++) {
		
					//Grab a random nibble
					var randByte = encryptor_module.random_data.slice(x*4, x*4 + 4).join("");
					
					//Convert to decimal
					randByte = parseInt(randByte, 2);
		
					//console.log( parseInt(encryptor_module.plaintext_data[x],16) + "|" + randByte);
					
					//Xor the nibbles
					var xorByte = (randByte ^ encryptor_module.plaintext_data[x]); //XOR
					
					//Push the encrypted nibble to encrypted data
					encryptor_module.encrypted_data += xorByte.toString(16);
				}
				
				
				//VN?
				if (document.getElementById("use_vn").checked) {
					for (var x = 0; x < encryptor_module.plaintext_data.length; x++) {
			
						//Grab a random nibble
						var randByte = encryptor_module.random_data_vn.slice(x*4, x*4 + 4).join("");
						
						//Convert to decimal
						randByte = parseInt(randByte, 2);
			
						//console.log( parseInt(encryptor_module.plaintext_data[x],16) + "|" + randByte);
						
						//Xor the nibbles
						var xorByte = (randByte ^ encryptor_module.plaintext_data[x]); //XOR
						
						//Push the encrypted nibble to encrypted data
						encryptor_module.encrypted_data_vn += xorByte.toString(16);
					}
				}
				
				
			}
			
			//Use the VNC
			if (document.getElementById("use_vn").checked) {
				encryptor_module.make_vn_data();
			}
			
			if(encryptor_module.imageFile){encryptor_module.showImages();}
			else{
				var element = document.getElementById("encrypted_vn");
				var c = element.getContext("2d");
				c.clearRect(0, 0, 512, 512);
					
				if (document.getElementById("use_vn").checked) {
					c.fillStyle = "blue";
					c.font = "60px Arial";
					
					c.fillText(encryptor_module.encrypted_data_vn.slice(0,10) + "...", 0,60);
				}
				
				element = document.getElementById("encrypted");
				c = element.getContext("2d");
				c.clearRect(0, 0, 512, 512);
				c.fillStyle = "blue";
				c.font = "60px Arial";
				
				c.fillText(encryptor_module.encrypted_data.slice(0,10) + "...", 0,60);
			}
			encryptor_module.outputResult();
			encryptor_module.testRandomness(encryptor_module.random_data, "input data");
			if (document.getElementById("use_vn").checked) {
				encryptor_module.testRandomness(encryptor_module.random_data_vn, "VN corrected data");
			}

		}

	},

	get_image_data: function () {
		element = document.getElementById("plainText");
		c = element.getContext("2d");

		// read the width and height of the canvas
		encryptor_module.image_width = element.width;
		encryptor_module.image_height = element.height;

		// get all canvas pixel data
		try {
			encryptor_module.plaintext_data = c.getImageData(0, 0, encryptor_module.image_width, encryptor_module.image_height);
			//This needs to be better! TODO
			encryptor_module.encrypted_data = c.getImageData(0, 0, encryptor_module.image_width, encryptor_module.image_height);
			encryptor_module.plaintext_data_vn = c.getImageData(0, 0, encryptor_module.image_width, encryptor_module.image_height);
		} catch (e) {
			var isChrome = !!window.chrome && !!window.chrome.webstore;
			if (isChrome) {
				encryptor_module.log("You are using Chrome, you need to run it with the argument --allow-file-access-encryptor_module.readerPlainom-files");
				return -1;
			}
		}
		return 1;
	},

	getTimeUnit: function (t) {
		"use strict";
		var time = parseFloat(t);
		if (t.endsWith("ps")) {
			return time;
		} else if (t.endsWith("ns")) {
			return time * 1000; //return it as it is
		} else if (t.endsWith("us")) {
			return time * 1000000; //return it as it is
		} else if (t.endsWith("ms")) {
			time = time * 1000000000;
		} else {
			time = time * 1000000000000;
		}
		return Math.round(time);
	},

	handleFile: function (evt) {
		
		if (this.files[0].type.match('image.*')) {
			//console.log("is an image");
			encryptor_module.imageFile = true;
			encryptor_module.im.onload = encryptor_module.imageLoaded;
			encryptor_module.im.src = this.files[0].name;

		}else{
			encryptor_module.imageFile = false;
		}
		encryptor_module.readerPlain.readAsBinaryString(this.files[0]);
	},

	handleOTP: function (evt) {
		"use strict";

		document.getElementById('working').innerHTML = '<i class="fa fa-cog fa-spin"></i>';
		document.getElementById("resultFile").innerHTML = "";

		encryptor_module.fiplainTextme = evt.target.files[0].name;
		encryptor_module.log("Working on file:" + evt.target.files[0].name);
		encryptor_module.readerOTP.readAsText(evt.target.files[0]);
		document.getElementById('files').value = null;
	},

	imageLoaded: function (ev) {
		element = document.getElementById("plainText");
		c = element.getContext("2d");
		this.im = ev.target; // the image, assumed to be 200x200
		this.im.crossOrigin = "Anonymous";

		// stamp the image on the left of the canvas:
		c.drawImage(this.im, 0, 0);
	},

	process_data: function () {
		"use strict";
		var i = 0,
		line;

		for (i = 3; i < this.rows_from_file.length; i = i + 1) {
			line = this.rows_from_file[i].split(/\b\s+/);
			try {
				if (line[1][0] != line[1][1]) {
					this.random_data.push(parseInt(line[1][0], 2));
				}
			} catch (e) {}

		}
		this.log("Input data from PSPice: " + this.rows_from_file.length);
		this.log("Corrected data size: " + this.random_data.length);
	},

	log: function (t) {
		"use strict";
		//var currentdate = new Date(), datetime = ("0" + currentdate.getHours()).slice(-2) + ":" + ("0" + currentdate.getMinutes()).slice(-2) + ":" + ("0" + currentdate.getSeconds()).slice(-2);

		if (t) {
			//document.getElementById("log").innerHTML = "[" + datetime + "] " + t + "\r\n" + document.getElementById("log").innerHTML;
			document.getElementById("log").innerHTML = t + "\r\n" + document.getElementById("log").innerHTML;
		} else {
			document.getElementById("log").innerHTML = "";
		}
	},

	outputResult: function () {
		"use strict";
		var rows_text = "",
		i,
		a,
		file;

		if (document.getElementById("use_vn").checked) {
			for (i = 0; i < this.random_data_vn.length; i = i + 1) {
				rows_text += this.random_data_vn[i].toString().trim() + "\r\n"; //trim each element add the CR
			}
		} else {
			for (i = 0; i < this.random_data.length; i = i + 1) {
				rows_text += this.random_data[i].toString().trim() + "\r\n"; //trim each element add the CR
			}
		}

		//chop the last two char cr and lf encryptor_module.readerPlainom string

		if (document.getElementById("download_Result").checked) {
			a = document.createElement("a");
			file = new Blob([rows_text.substring(0, rows_text.length - 2)], {
					type: 'text/plain'
				});
			a.href = URL.createObjectURL(file);
			a.download = this.fiplainTextme.split(".")[0] + "-result.txt";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		}

		document.getElementById("resultFile").innerHTML = rows_text.substring(0, rows_text.length - 2);
	},

	testRandomness: function (test_data, data_name) {
		"use strict";
		//this.log("Running randomness test on " + data_name + "...");
		var E = test_data.length,
		N = 0,
		N1 = 0,
		N2 = 0,
		SUM = 0.0,
		R = 1,
		i,
		x,
		y,
		z,
		a,
		EM,
		SD1,
		SD2,
		SD3,
		SD4,
		SD,
		z1,
		z2,

		P1,
		p,
		t,
		tt,
		t1,
		t2,
		PV,
		resultText;

		//calculate mean
		// Run through all the input, add those that have valid values
		for (i = 0; i < E; i = i + 1) {

			if (!isNaN(parseFloat(test_data[i]))) {
				//if(data_name == "VN corrected data") { console.log(parseFloat(test_data[i]));}
				SUM += parseFloat(test_data[i]);
				N = N + 1;
			}
		}
		//check for insufficient data
		if (N <= 5) {
			this.log("Insufficient data for randomness test (" + N + ").");
			console.log("Test data size:" + test_data.length);
		} else {
			// Do the math
			x = SUM / N;
			y = Math.round(100000 * x);
			z = y / 100000;

			// run through each value and compare it with mean
			for (i = 0; i < E; i = i + 1) {
				//check if a value is present and discard the ties
				if ((!isNaN(parseFloat(test_data[i]))) && (parseFloat(test_data[i]) !== x)) {
					//check if it is greater than mean then adds one
					if (parseFloat(test_data[i]) > x) {
						N1 = N1 + 1;
						a = i;
						while (a > 0) {
							a = a - 1;
							if ((!isNaN(parseFloat(test_data[a]))) && (parseFloat(test_data[a]) !== x)) {
								break;
							}
						}
						if (parseFloat(test_data[a]) < x) {
							R = R + 1;
						}
					} else if (parseFloat(test_data[i]) < x) { //if it is less than mean
						N2 = N2 + 1;
						a = i;
						while (a > 0) {
							a = a - 1;
							if ((!isNaN(parseFloat(test_data[a]))) && (parseFloat(test_data[a]) !== x)) {
								break;
							}
						}
						if (parseFloat(test_data[a]) > x) {
							R = R + 1;
						}
					} //closing else-if statement
				}
			}
			//form.NR.value = R;     //value of x or "Scores"

			//compute the expected mean and variance of R
			EM = 1 + (2 * N1 * N2) / (N1 + N2); //Mean "Mu"
			SD1 = [2 * N1 * N2 * (2 * N1 * N2 - N1 - N2)];
			SD2 = Math.pow((N1 + N2), 2);
			SD3 = N1 + N2 - 1;
			SD4 = SD1 / (SD2 * SD3); //Standard deviation "Sigma"
			SD = Math.sqrt(SD4);
			//calculating P value MStyle
			z1 = (R - EM) / SD;
			z2 = Math.abs(z1);
			z = z2;

			t = (z > 0) ? z : (-z);
			P1 = Math.pow((1 + t * (0.049867347 + t * (0.0211410061 + t * (0.0032776263 + t * (0.0000380036 + t * (0.0000488906 + t * (0.000005383))))))), -16);
			p = 1 - P1 / 2;
			t = 1 - ((z > 0) ? p : 1 - p); //this is P-value

			//rounding the value
			tt = String(t); //forcing to be a string
			if (tt.indexOf("e") !== -1) {
				PV = "Almost Zero";
			} else {
				t1 = Math.round(100000 * t);
				t2 = t1 / 100000; //this is P-value too
				PV = t2;
			}
			//determine the conclusion
			if (t2 < 0.01) {
				resultText = "Very strong evidence against randomness (trend or seasonality)";
			} else if (t2 < 0.05 && t2 >= 0.01) {
				resultText = "Moderate evidence against randomness";
			} else if (t2 < 0.10 && t2 >= 0.05) {
				resultText = "Suggestive evidence against randomness";
			} else if (t2 >= 0.10) {
				resultText = "Little or no real evidence against randomness";
			} else {
				resultText = "Strong evidence against randomness (trend or seasonality exists)";
			}

			this.log("P-value of " + data_name + "=" + PV);
		}
	},

	make_vn_data: function () {
		"use strict";
		var i;
		for (i = 0; i < this.random_data.length - 1; i = i + 2) {
			/*
			If the input is "00" or "11", the input is discarded (no output).
			If the input is "10", output a "1".
			If the input is "01", output a "0".
			 */
			//console.log(i + ": first bit:" + this.random_data[i] + " second bit:" + this.random_data[i+1]);
			if (this.random_data[i] !== this.random_data[i + 1]) {

				if (this.random_data[i] === 1) {
					this.random_data_vn.push(1);
				} else if (this.random_data[i + 1] === 1) {
					this.random_data_vn.push(0);
				}
			}
		}
		this.log("Von Neumann data size: " + this.random_data_vn.length);
	},

	showImages: function () {
		"use strict";

		var x,
		y,
		pos,
		randIndex,
		randByte,
		bit,
		element2,
		element3,
		c2,
		c3,
		index;
		if (this.random_data.length < (this.image_height * this.image_width)) {
			this.log("Random data is too small (" + this.random_data.length + "), repeating the random XOR");
		}

		for (y = 1; y < this.image_height + 1; y++) {
			pos = y * this.image_width * 4; // *4 for 4 ints per pixel
			for (x = 1; x < this.image_width + 1; x++) {
				randIndex = x * y % this.random_data.length;
				randByte = this.random_data.slice(randIndex, randIndex + 8).join("");

				randByte = parseInt(randByte, 2);
				bit = (randByte ^ this.plaintext_data.data[pos]); //XOR
				pos = pos + 4; //move the pointer on 4 places
				index = (x + y * this.image_width) * 4;
				this.encrypted_data.data[index] = bit;
				this.encrypted_data.data[index + 1] = bit;
				this.encrypted_data.data[index + 2] = bit;
				this.encrypted_data.data[index + 3] = 255;
			}

		}
		element2 = document.getElementById("encrypted");
		c2 = element2.getContext("2d");
		c2.putImageData(this.encrypted_data, 0, 0);

		//-------- VN
		if (document.getElementById("use_vn").checked) {

			if (this.random_data_vn.length < (this.image_height * this.image_width)) {
				this.log("VN corrected data is too small (" + this.random_data_vn.length + "),  repeating the random XOR");
			}
			for (y = 1; y < this.image_height + 1; y++) {
				pos = y * this.image_width * 4; // *4 for 4 ints per pixel
				for (x = 1; x < this.image_width + 1; x++) {
					randIndex = x * y % this.random_data_vn.length;
					randByte = this.random_data_vn.slice(randIndex, randIndex + 8).join("");
					randByte = parseInt(randByte, 2);
					bit = (randByte ^ this.plaintext_data_vn.data[pos]); //XOR
					pos = pos + 4; //move the pointer on 4 places
					index = (x + y * this.image_width) * 4;
					this.plaintext_data_vn.data[index] = bit;
					this.plaintext_data_vn.data[index + 1] = bit;
					this.plaintext_data_vn.data[index + 2] = bit;
					this.plaintext_data_vn.data[index + 3] = 255;
				}

			}

			element3 = document.getElementById("encrypted_vn");
			c3 = element3.getContext("2d");
			c3.putImageData(this.plaintext_data_vn, 0, 0);
		}
	},

	updateCheckboxes: function () {
		"use strict";
		this.log("checking DL:" + document.getElementById('download_Result').checked + " VN:" + document.getElementById('use_vn').checked);
		localStorage.setItem('download_Result', document.getElementById('download_Result').checked);
		localStorage.setItem('use_vn', document.getElementById('use_vn').checked);
	},

	vonNeumannCorrector: function () {
		"use strict";
		this.rows_processed_vn = [];
		var i;
		for (i = 0; i < this.rows_processed.length; i = i + 2) {
			/*
			If the input is "00" or "11", the input is discarded (no output).
			If the input is "10", output a "1".
			If the input is "01", output a "0".
			 */
			if (parseInt(this.rows_processed[i], 10) !== parseInt(this.rows_processed[i + 1], 10)) {

				if (parseInt(this.rows_processed[i], 10) === 1) {
					this.rows_processed_vn.push(1);
				} else if (parseInt(this.rows_processed[i + 1], 10) === 1) {
					this.rows_processed_vn.push(0);
				}
			}
		}

	},
};
