/* TO-DO
Organize code by function
Add interface to import RLE files
Export function
*/

/* object imported by Game.import() */
var RLEmap = function()
{
    this.S = [9];
    this.B = [9];
    this.maxx = 0;
    this.maxy = 0;
    this._data = new Array();
    this.get_cell = function(x,y)
    {
        return this._data[y*this.maxx+x];
    }
    
    /* exteneded settings below */
    this.fps;
}

var width = 640;    //resolution of canvas -- independent from game object
var height = 640;
var scale = 1;      //used by canvas
var fps = 60;       //frames per second to attempt
var running = 1;    //Is the simulation running? -- move to game object
var step = 0;       //Run simulation one tick on next iteration
var update = 0;     //Update canvas -- needs to be moved to game object
var url = "http://www.conwaylife.com/patterns/replicator.rle"; // default game map
var xoffset = 0;    //used for scrolling
var yoffset = 0;    //used for scrolling
var redraw_screen = 0;  //mark the entire screen for redraw -- only used for zoom and scroll
var default_macro = 0; //conway
var hud_hidden = 0;
var last_moved_mouse = Date.now();

/* keyboard stuff */
var pressed;    //is the key pressed?
var key;        //which key?
                //This is all for implementing rubberband scrolling

var gol = new Game(width, height);
setRuleToggles(gol.setMacro(default_macro));

/* Get canvas object */
var element = document.getElementById("game");
var c = element.getContext("2d");
var imageData = c.createImageData(width*scale, height*scale);

/* what to do with these? */
var move_factor = 0;
var zoom = 1;

/* Set interval loop using main loop below */
setInterval(main, (1000/fps)|0);

var scroll_pause = 0;
togglePause();

/* Main loop */
function main()
{
    if ((running||step) && !scroll_pause)
    {
        gol.iterate();
    }
    
    if(running && !hud_hidden && Date.now() - last_moved_mouse > 3000)
        hudOff();
    if(hud_hidden && Date.now() - last_moved_mouse < 3000)
        hudOn();
    
    var update_coors;
    
    if (pressed)
    {
        if(key=="up")
        {
            moveUp();
            scroll_pause = 1;
        }
        else if (key=="down")
        {
            moveDown();
            scroll_pause = 1;
        }
        else if (key=="left")
        {
            moveLeft();
            scroll_pause = 1;
        }
        else if (key=="right")
        {
            moveRight();
            scroll_pause = 1;
        }
    }
    else
    {
        if (key)
        {
            if (!stopMove())
            {
                scroll_pause = 0;
                key = 0;
                fps=60;
            }
            
            if(key=="up")
                moveUp();
            else if (key=="down")
                moveDown();
            else if (key=="left")
                moveLeft();
            else if (key=="right")
                moveRight()
        }
    
    }
        
    if (gol.map.updated.length > 0)
    {
        do
        {
            updated_coors = gol.map.updated.pop();
            if(!redraw_screen && updated_coors)
            {
                out = gol.map.get_output(updated_coors.x, updated_coors.y);
                setPixel(imageData, normalizeX(updated_coors.x-xoffset), normalizeY(updated_coors.y-yoffset), out.r, out.g, out.b, (scale * zoom));
                updated = 1;
            }
        
        } while (updated_coors);
    }
    
    if(redraw_screen)
    {
        for (y = 0; y * zoom < height; y++)
        {
            for (x = 0; x * zoom < width ; x++)
            {
                out = gol.map.get_output(x+xoffset,y+yoffset);
                setPixel(imageData, x, y, out.r, out.g, out.b, (scale * zoom));
            }
        }
    }
    
    if (running || redraw_screen || updated)
    {
        c.putImageData(imageData, 0, 0);
    }
    
    if (step)
        step = 0;
        
    redraw_screen = 0;
    updated = 0;
}

function toggleInfo()
{
    if (document.getElementById("about").style.display != "block")
    {
        document.getElementById("about").style.display = "block";
        $( "#about" ).addClass( "hud" );
    }
    else
    {
        document.getElementById("about").style.display = "none";
        $( "#about" ).removeClass( "hud" );
    }
}

function toggleError(e)
{
    if (e && document.getElementById("error").style.display != "block")
    {
        document.getElementById("error_body").innerHTML = e.error;
        document.getElementById("error").style.display = "block";
        $( "#error" ).addClass( "hud" );
    }
    else
    {
        document.getElementById("error").style.display = "none";
        $( "#error" ).removeClass( "hud" );
    }
}

/* for centering with offset ONLY */
function center(a, b)
{
    return (Number(a) + Number(b))/2;
}

function importRLEFromURL(url)
{
    var text;
    $.ajax({async: false, url: url})
          .done(function(resp) {
           text = resp;
          })
          .fail(function() {
            text = 0;
          })
          .always(function() {
    });
    return text;
}

function importRLEFromFile(e)
{
    var file = e.target.files[0];
    if (!file)
    {
        return;
    }
    var reader = new FileReader();
    
    reader.onload = function(e)
    {
        var contents = e.target.result;
    
        var sb = catchError(gol.map.import(createModuleFromRLE(contents)));
    
        if (sb)
            setRuleToggles(sb);
        xoffset = 0;
        yoffset = 0;
        if (running)
            togglePause();
    };
    
      reader.readAsText(file);
}

/* create map module for import */
function createModuleFromRLE(text)
{
    if(!text)
    {
        return;
    }
    
    /* regex rules */
    var find_rule = new RegExp("rule *= *([sbSB])?([0123456789]+)\/([sbSB])?([0123456789]+)"); //regex for finding the ruleset
    var find_map = /^[\d\n\r\$bo]*!/gm  // regex for locating map
    var rle_map = new RLEmap();
    
    /* needed to keep value of lastIndex */
    var build_map = /([\d]*)([(o|b|$)])/ig; // regex for building map
    rle_map.maxx = /x *= *([0123456789]+)/ig.exec(text)[1];
    rle_map.maxy = /y *= *([0123456789]+)/ig.exec(text)[1];
    var r_map = find_map.exec(text)[0].replace("\n", "");
    var total_count = 0;                    // how many elements have been added to map -- uneeded
    var number_to_add = 0;                  // number to add to offset from begginning of map
    var map_out;                            // current map element to parse
    var remaining_on_line = rle_map.maxx;   // needed due to the strange way some files handle $
    
    /* Get tokens and parse the map */
    parse_map: do
    {
        number_to_add = 0;
        map_out = build_map.exec(r_map);
    
        if (map_out && map_out[2] != "$"  && map_out[1] == "") //OB with no length arguments
        {
            number_to_add = 1;                                          //This always has length of 1
            remaining_on_line -= number_to_add;                         //Subtract this
        }
        else if (map_out && map_out[2] == "$" && map_out[1] != "")//newline with length argument
        {
            number_to_add += (Number(map_out[1]) - 1) * rle_map.maxx;   //Add number of full lines
            number_to_add += remaining_on_line;                         //Add amount unused on current line
        
            remaining_on_line = rle_map.maxx;                           //reset remaining on line count
        }
        else if (map_out && map_out[2] == "$" && map_out[1] == "")//newline with no length argument
        {
            number_to_add += remaining_on_line - number_to_add;         //Do we have unused cells on line?
            remaining_on_line = rle_map.maxx;                           //Reset remaining
        }
        else if (map_out) //OB with length argument
        {
            number_to_add = Number(map_out[1]);                         //Get argument
            remaining_on_line -= number_to_add;                         //Subtract it from remaining cells
        }
    
        /* only add alive cells because array init'd false by default */
        if (number_to_add && map_out && map_out[2] === "o")
            for (var i = 0; i < number_to_add; i++)
                    rle_map._data[i + total_count] = true;
        
        total_count += number_to_add;                                   //Add it all together to get new offset!

    } while (map_out);
    
    /* logic to assign correct rule to correct variable */
    if (find_rule.exec(text)) // found rule
    {
        if (find_rule.exec(text)[1] == "b" || find_rule.exec(text)[1] == "B" )
        {
            var b_rule = find_rule.exec(text)[2];
            var s_rule = find_rule.exec(text)[4];
        }
        else if (find_rule.exec(text)[1] == "s" || find_rule.exec(text)[1] == "S")
        {
            var s_rule = find_rule.exec(text)[2];
            var b_rule = find_rule.exec(text)[4];
        }
        else
        {
            var s_rule = find_rule.exec(text)[2];
            var b_rule = find_rule.exec(text)[4];
        }
    }
    else
    {
        /* If no rule found default to conways */
        var sb = gol.setMacro(0);
        setRuleToggles(sb);
    
        /* set rule in object to return */
        rle_map.S = sb.S;
        rle_map.B = sb.B;
    
        /* we are done! */
        return rle_map;
    }
    
    /* Set S and B */
    rle_map.S[0] = /0/g.test(s_rule);
    rle_map.S[1] = /1/g.test(s_rule);
    rle_map.S[2] = /2/g.test(s_rule);
    rle_map.S[3] = /3/g.test(s_rule);
    rle_map.S[4] = /4/g.test(s_rule);
    rle_map.S[5] = /5/g.test(s_rule);
    rle_map.S[6] = /6/g.test(s_rule);
    rle_map.S[7] = /7/g.test(s_rule);
    rle_map.S[8] = /8/g.test(s_rule);
    rle_map.B[0] = /0/g.test(b_rule);
    rle_map.B[1] = /1/g.test(b_rule);
    rle_map.B[2] = /2/g.test(b_rule);
    rle_map.B[3] = /3/g.test(b_rule);
    rle_map.B[4] = /4/g.test(b_rule);
    rle_map.B[5] = /5/g.test(b_rule);
    rle_map.B[6] = /6/g.test(b_rule);
    rle_map.B[7] = /7/g.test(b_rule);
    rle_map.B[8] = /8/g.test(b_rule);
    
    return rle_map;
}

function Game(x,y)
{
    var cycle = 0;
    var speed =  0;
    var life =   1;
    var heat =   1;
    var pause =  0;
    var reset = 0;
    var maxx =  x;
    var maxy =  y;
    var B =     [];
    var S =     [];
    
    this.setMacro = function(macro_number)
    {
        switch(macro_number)
        {
            case 0://conway
                S =[
                /*0*/0,
                /*1*/0,
                /*2*/1,
                /*3*/1,
                /*4*/0,
                /*5*/0,
                /*6*/0,
                /*7*/0,
                /*8*/0];
                B =[
                /*0*/0,
                /*1*/0,
                /*2*/0,
                /*3*/1,
                /*4*/0,
                /*5*/0,
                /*6*/0,
                /*7*/0,
                /*8*/0];
                break;
            case 1://highlife
                S =[
                /*0*/0,
                /*1*/0,
                /*2*/1,
                /*3*/1,
                /*4*/0,
                /*5*/0,
                /*6*/0,
                /*7*/0,
                /*8*/0];
                B =[
                /*0*/0,
                /*1*/0,
                /*2*/0,
                /*3*/1,
                /*4*/0,
                /*5*/0,
                /*6*/1,
                /*7*/0,
                /*8*/0];
                break
            case 2://Day&night
                S =[
                /*0*/0,
                /*1*/0,
                /*2*/0,
                /*3*/1,
                /*4*/1,
                /*5*/0,
                /*6*/1,
                /*7*/1,
                /*8*/1];
                B =[
                /*0*/0,
                /*1*/0,
                /*2*/0,
                /*3*/1,
                /*4*/0,
                /*5*/0,
                /*6*/1,
                /*7*/1,
                /*8*/1];
                break
            case 3://Amoeba
                S =[
                /*0*/0,
                /*1*/1,
                /*2*/0,
                /*3*/1,
                /*4*/0,
                /*5*/1,
                /*6*/0,
                /*7*/0,
                /*8*/1];
                B =[
                /*0*/0,
                /*1*/0,
                /*2*/0,
                /*3*/1,
                /*4*/0,
                /*5*/1,
                /*6*/0,
                /*7*/1,
                /*8*/0];
                break
            case 4: // Vote
                S =[
                /*0*/0,
                /*1*/0,
                /*2*/0,
                /*3*/0,
                /*4*/1,
                /*5*/1,
                /*6*/1,
                /*7*/1,
                /*8*/1];
                B =[
                /*0*/0,
                /*1*/0,
                /*2*/0,
                /*3*/0,
                /*4*/0,
                /*5*/1,
                /*6*/1,
                /*7*/1,
                /*8*/1];
                break
            case 5://Assimilation - 4567/345
                S =[
                /*0*/0,
                /*1*/0,
                /*2*/0,
                /*3*/0,
                /*4*/1,
                /*5*/1,
                /*6*/1,
                /*7*/1,
                /*8*/0];
                B =[
                /*0*/0,
                /*1*/0,
                /*2*/0,
                /*3*/1,
                /*4*/1,
                /*5*/1,
                /*6*/0,
                /*7*/,
                /*8*/0];
                break
            case 6://Life without death
                S =[
                /*0*/1,
                /*1*/1,
                /*2*/1,
                /*3*/1,
                /*4*/1,
                /*5*/1,
                /*6*/1,
                /*7*/1,
                /*8*/1];
                B =[
                /*0*/0,
                /*1*/0,
                /*2*/0,
                /*3*/1,
                /*4*/0,
                /*5*/0,
                /*6*/0,
                /*7*/0,
                /*8*/0];
                break
            case 7: //Mazecentric
                S =[
                /*0*/0,
                /*1*/1,
                /*2*/1,
                /*3*/1,
                /*4*/1,
                /*5*/0,
                /*6*/0,
                /*7*/0,
                /*8*/0];
                B =[
                /*0*/0,
                /*1*/0,
                /*2*/0,
                /*3*/1,
                /*4*/0,
                /*5*/0,
                /*6*/0,
                /*7*/0,
                /*8*/0];
                break
            default:
                break;
        }
        return {S,B};
    }
    
    this.map = new function(){
        var _heat = new Uint32Array(new ArrayBuffer(maxx*maxy*4));
        var _cells = new Uint32Array(new ArrayBuffer(maxx*maxy*4));
        var _temp = new Uint32Array(new ArrayBuffer(maxx*maxy*4));
        //var _active = [];   //active cells
        this.updated = []; //Used as a stack
        
        this._get_index = function(x, y)
        {
            var return_val;
    
            /* normalize coordinates */
            if (x < 0)
            {
                x = ((x % maxx) + maxx);
            }
            else
            {
                x = x % maxx;
            }
        
            if (y < 0)
            {
                y = ((y % maxy) + maxy);
            }
            else
            {
                y = y % maxy;
            }
        
            return_val = (y * maxx) + x;
            return return_val;
        }
        
        this.import = function(module)
        {
            if(!module)
            {
                return {error: "Cannot open file!"}
                return;
            }
        
            if(module.maxx > maxx || module.maxy > maxy)
            {
                return {error: "Loaded pattern exceeds screen size!"}
                return;
            }
        
            /* clears all data arrays */
            this.clear();
        
            /* import into middle */
            var xoffset = ((maxx - module.maxx)/2)|0;
            var yoffset = ((maxy - module.maxy)/2)|0;
        
            for(var y = 0; y < module.maxy; y++)
                for(var x = 0; x < module.maxx; x++)
                    if(module.get_cell(x,y))
                    {
                        this.on(x+xoffset, y+yoffset);
                    }
                    else
                    {
                        this.off(x+xoffset,y+yoffset);
                    }
        
            S = module.S;
            B = module.B;
        
            /* return {S,B} to set toggles in interface */
            return {S,B};
        
        }
        
        /* clears all maps */
        this.clear = function()
        {
            this.updated = [];
            for(var y = 0; y < maxy; y++)
            {
                for(var x = 0; x < maxx; x++)
                {
                    var index = this._get_index(x,y);
                    _cells[index] = 0;
                    _heat[index] = 0;
                
                    /* fill updated array with every pixel */
                    this.updated.push({x:x,y:y});
                }
            }

        }
        
        /* creates soup */
        this.randomize = function()
        {
            /* clear all array */
            this.clear();
        
            for(var y = 0; y < maxy; y++)
            {
                for(var x = 0; x < maxx; x++)
                {
                    if(Math.round(Math.random()))
                    {
                        this.on(x,y);
                    }
                    else
                    {
                        this.off(x,y);
                    }
                }
            }
        }
        
        /* This function uses bitwise hacks as it was too slow with objects */
        this.get_neighbors = function(x, y)
        {
            var count = 0;
        
            var index = this._get_index(x,y);

            if (_cells[this._get_index(x, y-1)])    count++;
            if (_cells[this._get_index(x, y+1)])    count++;
            if (_cells[this._get_index(x-1, y)])    count++;
            if (_cells[this._get_index(x-1, y-1)])  count++;
            if (_cells[this._get_index(x-1, y+1)])  count++;
            if (_cells[this._get_index(x+1, y)])    count++;
            if (_cells[this._get_index(x+1, y-1)])  count++;
            if (_cells[this._get_index(x+1, y+1)])  count++;
        
            /* is the current cell alive? - use cached index to save cpu */
            if (_cells[index])                      count |= 0x10;  //Using fourth bit as flag for if current cell is alive
    
            return count;
        }
        this.on = function(x,y)
        {
            var index = this._get_index(x,y);
        
            /* update if needed */
            if (!_cells[index])
            {
                this.updated.push({x: x, y: y});
            }
        
            _cells[index] = 1;
            _heat[index] += 1;
        }
        
        this.off = function(x,y)
        {
            var index = this._get_index(x,y);
        
            /* update only if needed */
            if (_cells[index])
            {
                this.updated.push({x: x, y: y});
            }
        
            _cells[index] = 0;

        }
        
        this.is_alive = function(neighbors)
        {
            if (neighbors&0x10)
                return S[neighbors&0xF];    //Filter out alive bit
            else
                return B[neighbors&0xF];    //Filter out alive bit
        }
        
        this.apply_rules = function()
        {
            var swap;
            var alive;
            var check;
            alive = 0;
            var any_alive = 0; // were any found alive?

            for(y = 0; y < maxy; y++)
                for(x = 0; x < maxx; x++)
                {
                    index = (y * maxx) + x;
                    alive = this.is_alive(this.get_neighbors(x,y));
                    if (alive)
                    {
                        _temp[index] = 1;
                        _heat[index] += 1;
                        any_alive = 1;
                    }
                    else
                    {
                        _temp[index] = 0;
                    }
                
                    /* cell just was born or died */
                    if (alive != _cells[index])
                    {
                        this.updated.push({x: x, y: y});
                    }
                }
        
                if (!any_alive)
                    togglePause(); //Pause simulation if nothing is alive
        
            swap = _cells;
            _cells = _temp;
            _temp = swap;
        }
        
        /* produces output which is a combination of heat map and cells */
        this.get_output = function(x, y)
        {
            var index = this._get_index(x,y);
                
            /* this is the what we return if the cell is alive */
            if (_cells[index] == 1)
                return {
                    r: 255,
                    g: 0,
                    b: 0
                };
        
            /* Color of heatmap to be determined based on algorithm below */
            var output = {
                r: 0,
                g: 0,
                b: 0
            };
        
            if (!_heat[index])
                return output;
        
            var b = _heat[index];
        
            if (_heat[index] <= 255)
            {
                output.b = b;
                output.r = 0x0;
                output.g = 0x0;
            }
            else if (_heat[index] <= 511)
            {
                output.b = 0xFF;
                output.g = b&0xFF; // return the lower byte which is the blue channel
                output.r = 0x0;

            }
            else if (_heat[index] <= 767)
            {
                output.b = 0x0;
                output.g = 0xFF;
                output.r = b&0xFF;  // return the lower byte which is the blue channel
            }
            else
            {
                output.b = 0x0;
                output.g = 0xFF;
                output.r = 0xFF;
            }
            /* want to add up to orange here */
        
            return output;
        }
        
        
    }
    
    /* toggles meant to by .get_output() */
    this.toggle = new function(){
        /* show heat map */
        this.heat = function ()
        {
            heat ^= 1;      //toggles
            return heat;
        }
    
        /* show live cells */
        this.life = function ()
        {
            life ^= 1;      //toggles
            return life;
        }
    
        this.S = function(number)
        {
            S[number] ^= 1;      //toggles
            return {S,B};       //return S and B to set interface toggles
        }
        
        this.B = function(number)
        {
            B[number] ^= 1;      //toggles
            return {S,B};   //return S and B to set interface toggles
        }
    }
    /* do stuff every tick */
    this.iterate = function()
    {
        this.map.apply_rules();
    }
        this.map.clear();
}

function normalizeX(x)
{
    if (x < 0)
    {
        return ((x % width) + width);
    }
    else
    {
        return (x % width);
    }
}

function normalizeY(y)
{
    if (y < 0)
    {
        return ((y % height) + height);
    }
    else
    {
        return (y % height);
    }
}

function setMacro(number)
{
    var sb;
    
    sb = gol.setMacro(number);
    setRuleToggles(sb);
}

/* takes set of rules and toggles UI accordingly */
function setRuleToggles(sb)
{
    var state;
    var set;
    for (var i = 0; i < 9; i++)
    {
        if (sb.S[i])
        {
            set = "s";
            state = "on";
        }
        else
        {
            set = "s"
            state = "off";
        }
    
        document.getElementById(set.concat("[").concat(i).concat("]")).className = state;
    
        if (sb.B[i])
        {
            set = "b";
            state = "on";
        }
        else
        {
            set = "b";
            state = "off";
        }
    
        document.getElementById(set.concat("[").concat(i).concat("]")).className = state;
    }
}

/* Disable hud */
function hudOff()
{
    $(".hud").addClass("hud_dis");
    $(".hud").removeClass("hud");
    
    hud_hidden = 1;
}

function hudOn()
{
    $(".hud_dis").addClass("hud");
    $(".hud").removeClass("hud_dis");
    
    hud_hidden = 0;
}

/* logic for cursor interatction with canvas element */
function getCursorPosition(clientX, clientY)
{
    var out;
    var xoff;
    var yoff;
    var hud = document.getElementsByClassName("hud");
    var click_valid;
    var x;
    var y;
    var rect;
    
    /* assume click is valid */
    click_valid = 1;
    
    /* Check to see if we clicked on hud elements */
    Array.prototype.forEach.call(hud, function(entry){
        var rect = entry.getBoundingClientRect();
        if (clientY > rect.top && clientY < rect.bottom && clientX > rect.left && clientX < rect.right)
            click_valid = 0;
    });
    
    /* we clicked on hud so we will handle this in their event listeners */
    if (!click_valid)
        return;

    /* fix messed up offset */
    if (xoffset > width/2)
        xoff = (width - xoffset) * -1;
    else
        xoff = xoffset;
    
    if (yoffset > height/2)
        yoff = (height - yoffset) * -1;
    else
        yoff = yoffset;

    var rect = document.getElementById("game").getBoundingClientRect();
    var x = (clientX - rect.left)|0;
    var y = (clientY - rect.top - 1)|0;
    
    /* is input in bounds of canvas? ? */
    if (x > width || y > height || x <  0 || y < 0)
        return;
    
    /* time we last moved the mouse over canvas element */
    last_moved_mouse = Date.now();
    
    /* correct for scaling and zooming */
    x = Math.floor(x/(zoom * scale));
    y = Math.floor(y/(zoom * scale));
    
    /* determine if delete or insert pixel depending on left or right click */
    if (mousedown && button == 0)
        out = gol.map.on(x + xoff, y + yoff);   // xoff and yoff are used to correct for offsete from scrolling
    else if (mousedown && button == 2)
    {
        out = gol.map.off(x + xoff, y + yoff);
    }
    
    if (mousedown && running)
        togglePause();
    
}

/* Toggles interface for pause */
function togglePause()
{
    running ^= 1;   //toggle state
    
    if (!running)
        document.getElementById("pausebutton").className = "on";
    else
        document.getElementById("pausebutton").className = "off";
}

/* UI toggle for zoom */
function zoomIn()
{
    if (zoom <= 32)
    {
        zoom *= 2;
        redraw_screen = 1;
    }
}

/* UI toggle for zoom */
function zoomOut()
{
    if (zoom > 1)
    {
        zoom /= 2;
        redraw_screen = 1;
    }
}

/* Raise dialog or pass return variable along */
function catchError(e)
{
    if (!e.error)
    {
        return e;
    }
    
    /* Raise dialog */
    toggleError(e);
    return;
}

document.addEventListener('keydown', function(event) {
    var offset;
    offset = event.keyCode - 48;
    
    if(event.keyCode == 65)       //A
        setMacro(0);
    else if(event.keyCode == 83)  //S
        setMacro(1);
    else if(event.keyCode == 68)  //D
        setMacro(2);
    else if(event.keyCode == 70)  //F
        setMacro(3);
    else if(event.keyCode == 71)  //G
        setMacro(4);
    else if(event.keyCode == 72)  //H
        setMacro(5);
    else if(event.keyCode == 74)  //J
        setMacro(6);
    else if(event.keyCode == 75)  //K
        setMacro(7);
    else if(event.keyCode == 82)  //R
        gol.map.randomize();
    else if(event.keyCode == 80)  //P
    {
        togglePause();
    }
    else if(event.keyCode == 32)  //space
    {
        step ^= 1;
        running = 0;
    }
    else if(event.keyCode == 38)  //UP
    {
        key="up";pressed=1;fps=30;
    }
    else if(event.keyCode == 40)  //DOWN
    {
        key="down";pressed=1;fps=30;
    }
    else if(event.keyCode == 37)  //LEFT
    {
        key="left";pressed=1;fps=30;
    }
    else if(event.keyCode == 39)  //RIGHT
    {
        key="right";pressed=1;fps=30;
    }
    else if(event.keyCode == 88)  //ZOOM-IN
    {
        zoomIn();
    }
    else if(event.keyCode == 90)  //ZOOM-OUT
    {
        zoomOut();
    }
            
    /* Clean up offsets  */
    xoffset = xoffset % width;
    yoffset = yoffset % height;
    
    if (xoffset < 0)
        xoffset += width;
        
    if (yoffset < 0)
        yoffset += height;

});
var mousedown = 0;

var button;

document.addEventListener('mousedown', function(event)
{
    mousedown = 1;
    button = event.button;
    getCursorPosition(event.clientX, event.clientY);
});

document.addEventListener('mousemove', function(event)
{
    getCursorPosition(event.clientX, event.clientY);
});

function moveUp()
{
    if(move_factor * zoom < 16)
        move_factor++;
    yoffset -= move_factor;
    redraw_screen = 1;
}

function moveDown()
{
    if(move_factor * zoom < 16)
        move_factor++;
    yoffset += move_factor;
    redraw_screen = 1;
}

function moveLeft()
{
    if(move_factor * zoom < 16)
        move_factor++;
    xoffset -= move_factor;
    redraw_screen = 1;
}

function moveRight()
{
    if(move_factor * zoom < 16)
        move_factor++;
    xoffset += move_factor;
    redraw_screen = 1;
}

function stopMove()
{
    if (move_factor > 0)
        move_factor -= 3;
    
    if (move_factor < 0)
        move_factor = 0;

    redraw_screen = 1;
    return move_factor;
}

document.addEventListener('mouseup', function(event)
{
    mousedown = 0;
});

document.addEventListener('keyup', function(event) {
    if(event.keyCode == 38)  //UP
    {
        pressed=0;
    }
    else if(event.keyCode == 40)  //DOWN
    {
        pressed=0;
    }
    else if(event.keyCode == 37)  //LEFT
    {
        pressed=0;
    }
    else if(event.keyCode == 39)  //RIGHT
    {
        pressed=0;
    }
});

function interfaceLoadRLE(e)
{
    importRLEFromFile(e);
}

document.getElementById('file-input').addEventListener('change',interfaceLoadRLE, false);
