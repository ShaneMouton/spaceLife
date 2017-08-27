function Game(arg)
{
    var width = arg[width];
    var height = arg[height]
    var finite = arg[finite]
    var field = [];
    var iteration = 0;

    /* Changes since last iteration */
    var changes = [];
    var tested = [];

    if (!finite)
        field = new InfiniteField();
    elseif (fintite)
        field = new FiniteField();

    /* Prototypes  */
    var FieldAbstract = function()
    {
        this.bounds = {
            xUpper: 0,
            xLower: 0,
            yUpper: 0,
            yLower: 0
        };

        /* Conways game of life is default rule */
        this._B = [
            /*0*/false,
            /*1*/false,
            /*2*/true,
            /*3*/true,
            /*4*/false,
            /*5*/false,
            /*6*/false,
            /*7*/false,
            /*8*/false,
        ];

        this._S = [
            /*0*/false,
            /*1*/false,
            /*2*/false,
            /*3*/true,
            /*4*/false,
            /*5*/false,
            /*6*/false,
            /*7*/false,
            /*8*/false
        ];
    }

    FieldAbstract.prototype._getIndex = function(x, y)
    {
        return Math.abs(x*y+x);
    }

    FieldAbstract.prototype._setCell = function(x, y, data)
    {
        var cell;

        if (x < this.bounds.xLower)
            this.bounds.xLower = x;

        if (y < this.bounds.yLower)
            this.bounds.yLower = y;

        if (x > this.bounds.xUpper)
            this.bounds.xUpper = x;

        if (y > this.bounds.yUpper)
            this.bounds.yUpper = y;

        cell = this._getCell(x, y);
        cell.value = data;
    }

    FieldAbstract.prototype.getBounds = function()
    {
        return this.bounds;
    }

    var InfiniteField = function()
    {
        this._quadrant = [[],[],[],[]];
    }

   InfiniteField.prototype = new FieldAbstract();

    /*  Classes */
   InfiniteField.prototype._getQuadrant = function(x, y)
   {
       if(x <= 0 && y <= 0)        return 0;
       if(x <= 0 && !(y <= 0))     return 1;
       if(!(x <= 0) && y <= 0)     return 2;
       if(!(x <= 0) && !(y <= 0))  return 3;
   }

    InfiniteField.prototype._getCell = function(x, y)
    {
        var q = this._getQuadrant(x,y);
        var idx = this._getIndex(x,y)

        if (typeof this._quadrant[q][idx] === 'undefined')
        {
            console.log("value not set!")
           this._quadrant[q][idx] = {heat:0, value: null};
       }

        return this._quadrant[q][idx];
    }

    var FiniteField = Object.create(FieldAbstract.prototype);

    FiniteField.prototype.constructor = function()
    {

    }

    /* return count of living cells */
    this._countNeighbors = function(x, y)
    {
        var count = 0;

        if (this.fields._getCell(x, y-1))    count++;
        if (this.fields._getCell(x, y+1))    count++;
        if (this.fields._getCell(x-1, y))    count++;
        if (this.fields._getCell(x-1, y-1))  count++;
        if (this.fields._getCell(x-1, y+1))  count++;
        if (this.fields._getCell(x+1, y))    count++;
        if (this.fields._getCell(x+1, y-1))  count++;
        if (this.fields._getCell(x+1, y+1))  count++;

        return count;
    }

    this._applyRule = function(x, y)
    {
        var count = this._countNeighbors(x,y);
        var isAlive = (this._getCell(x,y) ? true : false);

        if (!isAlive) /* is dead */
        {
            if (this._B[count])
                this._setCell(x, y, true);
        }
        else /* is alive */
        {
            if (!this._S[count])
                this._setCell(x, y, false);

        }
    }

}
