function setPixel(imageData, x, y, r, g, b, scale)
{    
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
            imageData.data[index+3+x] = 255;
        }
        index += (imageData.width * 4);
    }
}
