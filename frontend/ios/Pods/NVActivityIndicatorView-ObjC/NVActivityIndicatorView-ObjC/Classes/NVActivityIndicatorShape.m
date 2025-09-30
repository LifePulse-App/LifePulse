#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorShapeHelper

+ (CALayer *)layerWithShape:(NVActivityIndicatorShape)shape size:(CGSize)size color:(UIColor *)color {
    CAShapeLayer *layer = [[CAShapeLayer alloc] init];
    UIBezierPath *path = [[UIBezierPath alloc] init];
    CGFloat lineWidth = 2.0;
    
    switch (shape) {
        case NVActivityIndicatorShapeCircle:
            [path addArcWithCenter:CGPointMake(size.width / 2, size.height / 2)
                            radius:size.width / 2
                        startAngle:0
                          endAngle:2 * M_PI
                         clockwise:NO];
            layer.fillColor = color.CGColor;
            break;
            
        case NVActivityIndicatorShapeCircleSemi:
            [path addArcWithCenter:CGPointMake(size.width / 2, size.height / 2)
                            radius:size.width / 2
                        startAngle:-M_PI / 6
                          endAngle:-5 * M_PI / 6
                         clockwise:NO];
            [path closePath];
            layer.fillColor = color.CGColor;
            break;
            
        case NVActivityIndicatorShapeRing:
            [path addArcWithCenter:CGPointMake(size.width / 2, size.height / 2)
                            radius:size.width / 2
                        startAngle:0
                          endAngle:2 * M_PI
                         clockwise:NO];
            layer.fillColor = nil;
            layer.strokeColor = color.CGColor;
            layer.lineWidth = lineWidth;
            break;
            
        case NVActivityIndicatorShapeRingTwoHalfVertical:
            [path addArcWithCenter:CGPointMake(size.width / 2, size.height / 2)
                            radius:size.width / 2
                        startAngle:-3 * M_PI / 4
                          endAngle:-M_PI / 4
                         clockwise:YES];
            [path moveToPoint:CGPointMake(size.width / 2 - size.width / 2 * cos(M_PI / 4),
                                         size.height / 2 + size.height / 2 * sin(M_PI / 4))];
            [path addArcWithCenter:CGPointMake(size.width / 2, size.height / 2)
                            radius:size.width / 2
                        startAngle:-5 * M_PI / 4
                          endAngle:-7 * M_PI / 4
                         clockwise:NO];
            layer.fillColor = nil;
            layer.strokeColor = color.CGColor;
            layer.lineWidth = lineWidth;
            break;
            
        case NVActivityIndicatorShapeRingTwoHalfHorizontal:
            [path addArcWithCenter:CGPointMake(size.width / 2, size.height / 2)
                            radius:size.width / 2
                        startAngle:3 * M_PI / 4
                          endAngle:5 * M_PI / 4
                         clockwise:YES];
            [path moveToPoint:CGPointMake(size.width / 2 + size.width / 2 * cos(M_PI / 4),
                                         size.height / 2 - size.height / 2 * sin(M_PI / 4))];
            [path addArcWithCenter:CGPointMake(size.width / 2, size.height / 2)
                            radius:size.width / 2
                        startAngle:-M_PI / 4
                          endAngle:M_PI / 4
                         clockwise:YES];
            layer.fillColor = nil;
            layer.strokeColor = color.CGColor;
            layer.lineWidth = lineWidth;
            break;
            
        case NVActivityIndicatorShapeRingThirdFour:
            [path addArcWithCenter:CGPointMake(size.width / 2, size.height / 2)
                            radius:size.width / 2
                        startAngle:-3 * M_PI / 4
                          endAngle:-M_PI / 4
                         clockwise:NO];
            layer.fillColor = nil;
            layer.strokeColor = color.CGColor;
            layer.lineWidth = 2;
            break;
            
        case NVActivityIndicatorShapeRectangle:
            [path moveToPoint:CGPointMake(0, 0)];
            [path addLineToPoint:CGPointMake(size.width, 0)];
            [path addLineToPoint:CGPointMake(size.width, size.height)];
            [path addLineToPoint:CGPointMake(0, size.height)];
            layer.fillColor = color.CGColor;
            break;
            
        case NVActivityIndicatorShapeTriangle: {
            CGFloat offsetY = size.height / 4;
            [path moveToPoint:CGPointMake(0, size.height - offsetY)];
            [path addLineToPoint:CGPointMake(size.width / 2, size.height / 2 - offsetY)];
            [path addLineToPoint:CGPointMake(size.width, size.height - offsetY)];
            [path closePath];
            layer.fillColor = color.CGColor;
            break;
        }
            
        case NVActivityIndicatorShapeLine:
            path = [UIBezierPath bezierPathWithRoundedRect:CGRectMake(0, 0, size.width, size.height)
                                              cornerRadius:size.width / 2];
            layer.fillColor = color.CGColor;
            break;
            
        case NVActivityIndicatorShapePacman:
            [path addArcWithCenter:CGPointMake(size.width / 2, size.height / 2)
                            radius:size.width / 4
                        startAngle:0
                          endAngle:2 * M_PI
                         clockwise:YES];
            layer.fillColor = nil;
            layer.strokeColor = color.CGColor;
            layer.lineWidth = size.width / 2;
            break;
            
        case NVActivityIndicatorShapeStroke:
            [path addArcWithCenter:CGPointMake(size.width / 2, size.height / 2)
                            radius:size.width / 2
                        startAngle:-(M_PI / 2)
                          endAngle:M_PI + M_PI / 2
                         clockwise:YES];
            layer.fillColor = nil;
            layer.strokeColor = color.CGColor;
            layer.lineWidth = 2;
            break;
    }
    
    layer.backgroundColor = nil;
    layer.path = path.CGPath;
    layer.frame = CGRectMake(0, 0, size.width, size.height);
    
    return layer;
}

@end
