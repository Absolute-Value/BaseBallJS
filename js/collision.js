// 与えられた点(cx, cy)が三角形の内部にあるかどうかを検出する
// 参考: https://en.wikipedia.org/wiki/Point_in_polygon
triangleCollision = function (x1, y1, x2, y2, x3, y3, px, py) {
    var d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
    var d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
    var d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);
    return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
}

// 円と円が衝突しているかどうかを検出する
circleCollision = function (x1, y1, r1, x2, y2, r2) {
    if ((x1-x2)**2 + (y1-y2)**2 <= (r1+r2)**2) {
        return true;
    } else {
        return false;
    }
}