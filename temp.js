
/*+==========================================================================+*\
                      __________  ___  _  __________  _  __
                     /_  __/ __ \/ _ \| |/_/  _/ __ \/ |/ /
                      / / / /_/ / , _ >  <_/ // /_/ /    / 
                     /_/  \____/_/|_/_/|_/___/\____/_/|_/  

\*+==========================================================================+*/

"use strict"

var canvas = document.createElement("canvas");
var gfx = canvas.getContext("2d");
var ww,wh,tick=0,tickOffset=0,elapsed=0;
function rfloat(x){return Math.random()*x;};
function rInt(x){return Math.floor(Math.random()*x);};
function shuffle(ls){return ls.sort(function(){return 0.5-Math.random();});}
Number.prototype.mod = function(n){return((this%n)+n)%n;};

//==  RENDERING  =============================================================//

function rgb(r,g,b){return gfx.fillStyle=gfx.strokeStyle="rgb("+Math.floor(255*r)+","+Math.floor(255*g)+","+Math.floor(255*b)+")";};
function rgba(r,g,b,a){return gfx.fillStyle=gfx.strokeStyle="rgba("+Math.floor(255*r)+","+Math.floor(255*g)+","+Math.floor(255*b)+","+a+")";};

function hsv(h,s,v){
	var r,g,b,i,f,p,q,t;
	if (h&&s===undefined&&v===undefined)s=h.s,v=h.v,h=h.h;
	i = Math.floor(h*6);
	f = h*6-i;
	p = v*(1-s);
	q = v*(1-f*s);
	t = v*(1-(1-f)*s);
	switch(i%6){
		case 0:r=v,g=t,b=p;break;
		case 1:r=q,g=v,b=p;break;
		case 2:r=p,g=v,b=t;break;
		case 3:r=p,g=q,b=v;break;
		case 4:r=t,g=p,b=v;break;
		case 5:r=v,g=p,b=q;break;
	}return gfx.fillStyle=gfx.strokeStyle="rgb("+Math.floor(255*(1-r))+","+Math.floor(255*(1-g))+","+Math.floor(255*(1-b))+")";
}

var goldenAngle = 0.381966;
function hsva(h,s,v,a){
	var s = hsv(h,s,v);
	s = s.substring(0,3)+"a"+s.substring(3,s.length-1);
	return gfx.fillStyle=gfx.strokeStyle=s+","+a+")";
}

function drawHex(x,y,r){
	gfx.save();
	gfx.translate(x,y);
	gfx.beginPath();
	gfx.moveTo(0,r);
	gfx.lineTo(r/2*sq3,r/2);
	gfx.lineTo(r/2*sq3,-r/2);
	gfx.lineTo(0,-r);
	gfx.lineTo(-r/2*sq3,-r/2);
	gfx.lineTo(-r/2*sq3,r/2);
	gfx.lineTo(0,r);
	gfx.fill();
	gfx.restore();
};

var drawPath = function(cell,i){
	gfx.beginPath();
	var p0 = Math.min(cell.path[i],cell.path[i+1]);
	var p1 = Math.max(cell.path[i],cell.path[i+1]);
	switch(p0*10+p1){
		case  1:gfx.arc(48/2*sq3,48/2,48/2,5/6*Math.PI,3/2*Math.PI);break;
		case  2:gfx.arc(48/2*sq3,48*1.5,48*1.5,7/6*Math.PI,3/2*Math.PI);break;
		case  3:gfx.moveTo(48/2*sq3,0);gfx.lineTo(-48/2*sq3,0);break;
		case  4:gfx.arc(48/2*sq3,-48*1.5,48*1.5,1/2*Math.PI,5/6*Math.PI);break;
		case  5:gfx.arc(48/2*sq3,-48/2,48/2,1/2*Math.PI,7/6*Math.PI);break;
		case 12:gfx.arc(0,48,48/2,7/6*Math.PI,11/6*Math.PI);break;
		case 13:gfx.arc(-48/2*sq3,48*1.5,48*1.5,3/2*Math.PI,11/6*Math.PI);break;
		case 14:gfx.moveTo(48/4*sq3,48*3/4);gfx.lineTo(-48/4*sq3,-48*3/4);break;
		case 15:gfx.arc(48*sq3,0,48*1.5,5/6*Math.PI,7/6*Math.PI);break;
		case 23:gfx.arc(-48/2*sq3,48/2,48/2,3/2*Math.PI,1/6*Math.PI);break;
		case 24:gfx.arc(-48*sq3,0,48*1.5,-1/6*Math.PI,1/6*Math.PI);break;
		case 25:gfx.moveTo(-48/4*sq3,48*3/4);gfx.lineTo(48/4*sq3,-48*3/4);break;
		case 34:gfx.arc(-48/2*sq3,-48/2,48/2,11/6*Math.PI,1/2*Math.PI);break;
		case 35:gfx.arc(-48/2*sq3,-48*1.5,48*1.5,1/6*Math.PI,1/2*Math.PI);break;
		case 45:gfx.arc(0,-48,48/2,1/6*Math.PI,5/6*Math.PI);break;
	}gfx.stroke();
}

function textWidth(string,size,spacing){
	gfx.font = "800 "+size*1.37+"px helvetica";
	return gfx.measureText(string).width + (spacing * (string.length-1));
}

function text(string,x,y,size,spacing){
	gfx.textBaseline = "alphabetic";
	gfx.font = "800 "+size*1.37+"px helvetica";
	for(var i=0;i<string.length;++i){

		gfx.fillText(string.charAt(i),x,y+size);
		x += gfx.measureText(string.charAt(i)).width+spacing;
	}
}

//==  GRID GENERATION  =======================================================//

var sq3 = Math.sqrt(3);
var cellLs;
var markerLs;
var edgeCellLs;
var fillLs = [];
var fading = false;
var evaluate = false;
var lastEvalReqTick = -1;
var cellCtr = 0;
var width,height,scale;

var cell = function(){
	this.id = ++cellCtr+".";
	this.path = []; // 0-1 | 2-3 | 4-5
	this.used = [false,false,false,false,false,false];
	this.adjacent = [null,null,null,null,null,null]; // E SE SW W NW NE
	this.markers = [null,null,null,null,null,null]; // E SE SW W NW NE
	this.rotation = 0; // cw = + | ccw = - [ when this is a float, treat as its rendered rotation, treat discrete rot as invalid ]
	this.goalRotation = 0; // when rotating tile, modify this value instead of rotation
	this.x;
	this.y;

	this.shadow = function(){
		this.rotation+=(this.goalRotation-this.rotation)*elapsed*0.03;
		if(this.goalRotation !== this.rotation && Math.abs(this.goalRotation-this.rotation)<0.01)this.rotation = this.goalRotation;
		gfx.save();
		gfx.translate(this.x,this.y);
		gfx.rotate(this.rotation*Math.PI/3);
		gfx.shadowBlur = 4;
		gfx.shadowColor = rgb(0.1,0.1,0.1);drawHex(0,0,48-2);
		gfx.lineCap = "round";rgb(0.1,0.1,0.1);gfx.lineWidth = 19;
		gfx.beginPath();
		gfx.moveTo(48/2*sq3,0);gfx.lineTo(-48/2*sq3,0);
		gfx.moveTo(48/4*sq3,48*3/4);gfx.lineTo(-48/4*sq3,-48*3/4);
		gfx.moveTo(-48/4*sq3,48*3/4);gfx.lineTo(48/4*sq3,-48*3/4);
		gfx.stroke();
		for(var i=0;i<this.path.length;i+=2)drawPath(this,i);
		gfx.restore();
		return this.rotation === this.goalRotation;
	}

	this.render = function(){
		gfx.save();
		gfx.translate(this.x,this.y);
		gfx.rotate(this.rotation*Math.PI/3);
		rgb(0.6,0.6,0.6);drawHex(0,0,48-7);
		for(var i=0;i<this.path.length;i+=2){
			rgb(0.1,0.1,0.1);gfx.lineWidth = 19;drawPath(this,i);
			gfx.lineCap = "round";
			rgb(0.9,0.9,0.9);gfx.lineWidth = 10;drawPath(this,i);
			gfx.lineCap = "butt";
		}gfx.restore();
	};

	this.highlight = function(){
		gfx.save();
		gfx.translate(this.x,this.y);
		drawPath(this,0);
		gfx.restore();
	};

	this.rotateCW  = function(){++this.goalRotation;};
	this.rotateCCW = function(){--this.goalRotation;};
};

var marker = function(attach,side,color){
	this.attachedTo = attach;
	this.side = side; // 0-5, side marker is attached to on cell
	this.color = color; // what color
	this.partner = null; // marker this should connect to

	this.update = function(){};

	this.belowRender = function(){
		gfx.save();
		gfx.translate(this.attachedTo.x,this.attachedTo.y);
		var r = this.side*1/3*Math.PI;
		gfx.shadowColor = hsv(this.color,1,1);
		gfx.shadowBlur = 8;
		gfx.lineWidth = 27;
		hsv(this.color,1,1);
		gfx.beginPath();
		gfx.lineCap = "round";
		gfx.moveTo(0,0);
		var q = 6;
		gfx.lineTo(Math.cos(r)*(48-q),Math.sin(r)*(48-q));
		gfx.stroke();

		gfx.restore();
	};

	this.render = function(){
		gfx.save();
		gfx.translate(this.attachedTo.x,this.attachedTo.y);
		var r = this.side*1/3*Math.PI;
		gfx.shadowColor = hsv(this.color,1,1);
		gfx.shadowBlur = 4;
		gfx.lineWidth = 4;
		gfx.beginPath();
		gfx.lineCap = "round";
		gfx.moveTo(Math.cos(r)*(48-5.9),Math.sin(r)*(48-5.9));
		var q = 6;
		gfx.lineTo(Math.cos(r)*(48-q),Math.sin(r)*(48-q));
		gfx.stroke();

		gfx.restore();
	};
};

function generateGrid(minDepth,markerPairs,preGrid){
	// initializes cells, grid, and cellLs
	cellLs = [];
	edgeCellLs = [];
	fillLs = [];
	for(var i=0;i<preGrid.length;++i)
	for(var j=0;j<preGrid[i].length;++j)
	if(preGrid[i][j] === 1){
		var c = new cell();
		preGrid[i][j] = c;
		cellLs.push(c);
	}else preGrid[i][j] = null;

	// transpose grid
	var grid = preGrid[0].map(function(col,i){
		return preGrid.map(function(row){
			return row[i];
		});
	});

	// initialize pointers and coordinates
	var minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
	for(var i=0;i<grid.length;++i)
	for(var j=0;j<grid[i].length;++j)
	if(grid[i][j] !== null){
		var x = grid[i][j].x = (-(j-Math.floor(grid.length/2))+2*i-2*Math.floor(grid[0].length/2))*48/2*sq3;
		var y = grid[i][j].y = (1.5*48*j)-1.5*48*Math.floor(grid.length/2);
		if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
		if(i<grid.length-1)                     grid[i][j].adjacent[0]=grid[i+1][j  ];
		if(i<grid.length-1&&j<grid[i].length-1) grid[i][j].adjacent[1]=grid[i+1][j+1];
		if(j<grid[i].length-1)                  grid[i][j].adjacent[2]=grid[i  ][j+1];
		if(i>0)                                 grid[i][j].adjacent[3]=grid[i-1][j  ];
		if(i>0&&j>0)                            grid[i][j].adjacent[4]=grid[i-1][j-1];
		if(j>0)                                 grid[i][j].adjacent[5]=grid[i  ][j-1];
		for(var k=0;k<6;++k){
			if(grid[i][j].adjacent[k] === null){
				edgeCellLs.push(grid[i][j]);
				break;
			}
		}
	}

	minX -= 48/2*sq3;
	maxX += 48/2*sq3;
	minY -= 48;
	maxY += 48;

	width  = (maxX-minX)/48;
	height = (maxY-minY)/48;

	// initialize markers
	markerLs = [];
	shuffle(edgeCellLs);
	var markers = 0;
	fullList: for(var i in edgeCellLs) {
        var c = edgeCellLs[i];
        var dir, m0, m1;
        for (var k = 0; k < 6; k++) {
            if ((c.adjacent[k] != null) || (c.markers[k] != null)) {
                continue;
            }
            var dir = k;
            m0 = new marker(c, dir, markers * goldenAngle + 0.3);
            c.markers[dir] = m0;
            var destCell, destDir;
            var recurse = function (fromCell, fromDir, depth) {
                if (depth > 0)fromDir = (fromDir + 3) % 6;
                var adjLs = [0, 1, 2, 3, 4, 5];
                adjLs.splice(fromDir, 1);
                shuffle(adjLs);
                for (var a = 0; a < 6; ++a) {
                    if (fromCell.used[adjLs[a]])continue;
                    fromCell.used[fromDir] = true;
                    fromCell.used[adjLs[a]] = true;
                    fromCell.path.push(fromDir);
                    fromCell.path.push(adjLs[a]);

                    var clear = function () {
                        fromCell.used[fromDir] = false;
                        fromCell.used[adjLs[a]] = false;
                        fromCell.path.pop();
                        fromCell.path.pop();
                    }

                    var d = fromCell.adjacent[adjLs[a]];
                    if (d !== null && d !== undefined) {
                        if (recurse(d, adjLs[a], depth + 1))return true;
                        else {
                            clear();
                            continue;
                        }
                    } else if (fromCell.markers[adjLs[a]]) {
                        clear();
                        continue;
                    } else if (depth < minDepth) {
                        clear();
                        continue;
                    } else {
                        destCell = fromCell;
                        destDir = adjLs[a];
                        m1 = new marker(destCell, destDir, markers * goldenAngle + 0.3);
                        destCell.markers[adjLs[a]] = m1;
                        return true;
                    }
                }
                return false;
            };

            if (!recurse(c, dir, 0)) {
                c.markers[dir] = null;
                continue;
            }

            m0.partner = m1;
            m1.partner = m0;
            markerLs.push(m0);
            markerLs.push(m1);
            markers++;
            if (markers === markerPairs)
                break fullList;
        }
    }

	// add rest of paths
	for(var i in cellLs){
		var c = cellLs[i];
		if(c.path.length === 6)continue;
		var indicies = c.used.map(function(b,i){if(!b)return i;}).filter(function(e){return e !== undefined;});
		shuffle(indicies);
		c.path = c.path.concat(indicies);
	}

	// randomize rotations
	for(var i in cellLs)cellLs[i].goalRotation+=rInt(6)-3;
	requestEval();
	window.onresize();
};

function requestEval(){
	if(lastEvalReqTick === tick)return;
	lastEvalReqTick = tick;
	evaluate = true;
	requestAnimationFrame(render);
}

var firstEval = true;
function evalPaths(){
	var connected = 0;
	for(var i=0;i<fillLs.length;++i)fillLs[i][3] = 0; // fade everything out, gets set back to true if its detected
	for(var i=0;i<markerLs.length;i+=2){
		// returns true=found pair,save path | false=found null,ignore path
		var tracedPath = [];
		var hash = "";
		var recurse = function(fromCell,fromSide,originMkr){
			fromSide = (fromSide-fromCell.goalRotation).mod(6);
			var toSide;
			for(var i=0;i<6;++i)if(fromCell.path[i] === fromSide){
				if(i%2 === 0)toSide = fromCell.path[i+1];
				else toSide = fromCell.path[i-1];
				break;
			}toSide = (toSide+fromCell.goalRotation).mod(6);

			var saveCell = function(){
				var c = new cell();
				c.path.push((fromSide+fromCell.goalRotation).mod(6));
				c.path.push(toSide);
				c.x = fromCell.x;
				c.y = fromCell.y;
				tracedPath.push(c);
				hash += fromCell.id;
			}

			if(fromCell.adjacent[toSide] === null){
				if(fromCell.markers[toSide] === null)return false;
				else if(fromCell.markers[toSide].partner === originMkr){
					saveCell();
					return true;
				}else return false;
			}else{
				if(recurse(fromCell.adjacent[toSide],(toSide+3)%6,originMkr)){
					saveCell();
					return true;
				}else return false;
			}
		};

		var m = markerLs[i];
		recurse(m.attachedTo,m.side,m);
		if(tracedPath.length > 0){
			++connected;
			var hashFound = false;
			for(var q in fillLs){
				var f = fillLs[q];
				if(f[4] !== hash)continue;
				hashFound = true;
				f[3] = 1;
				break;
			}if(!hashFound)fillLs.push([m.color,tracedPath,0,1,hash]);
		}
	}

	if(firstEval)firstEval = false;
	else if(connected*2 === markerLs.length){
		overlayBig = "You Win!";
		overlaySub = "Click to start new game";
		overlay = 2;
		overlayGoal = 0.8;
	}
};
