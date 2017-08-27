var Screen = (function Screen()
{
    /* Get canvas object */
    // var element = document.getElementById("game");
    // var c = element.getContext("2d");
    // var imageData = c.createImageData(width*scale, height*scale);

    this.setPixel = function(x, y, r, g, b, a)
    {
        if(!isset(a)) a = 255;

        index = ((x*scale) + (y*scale) * imageData.width)*4;

        /* out of range so do nothing */
        if (y*scale + zoom > height)
            return;
        if (x*scale + zoom > width)
            return;

        for (y = 0; y < scale; y++)
        {
            for (x = 0; x < (scale * 4); x += 4)
            {
                imageData.data[index+0+x] = r;
                imageData.data[index+1+x] = g;
                imageData.data[index+2+x] = b;
                imageData.data[index+3+x] = a;
            }
            index += (imageData.width * 4);
        }
    }
})();
