#import "NVActivityIndicatorAnimationBallTrianglePath.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationBallTrianglePath

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CGFloat circleSize = size.width / 5;
    CGFloat deltaX = size.width / 2 - circleSize / 2;
    CGFloat deltaY = size.height / 2 - circleSize / 2;
    CGFloat x = (layer.bounds.size.width - size.width) / 2;
    CGFloat y = (layer.bounds.size.height - size.height) / 2;
    CFTimeInterval duration = 2.0 / speedMultiplier;
    CAMediaTimingFunction *timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseInEaseOut];

    // Animation
    CAKeyframeAnimation *animation = [CAKeyframeAnimation animationWithKeyPath:@"transform"];
    animation.keyTimes = @[@0, @0.33, @0.66, @1];
    animation.timingFunctions = @[timingFunction, timingFunction, timingFunction];
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;

    // Top-center circle
    CALayer *topCenterCircle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeRing size:CGSizeMake(circleSize, circleSize)
                                                                   color:color];
    [self changeAnimation:animation values:@[@"{0,0}", @"{hx,fy}", @"{-hx,fy}", @"{0,0}"] deltaX:deltaX deltaY:deltaY];
    topCenterCircle.frame = CGRectMake(x + size.width / 2 - circleSize / 2, y, circleSize, circleSize);
    [topCenterCircle addAnimation:animation forKey:@"animation"];
    [layer addSublayer:topCenterCircle];

    // Bottom-left circle
    CALayer *bottomLeftCircle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeRing
                                                                     size:CGSizeMake(circleSize, circleSize)
                                                                    color:color];
    [self changeAnimation:animation values:@[@"{0,0}", @"{hx,-fy}", @"{fx,0}", @"{0,0}"] deltaX:deltaX deltaY:deltaY];
    bottomLeftCircle.frame = CGRectMake(x, y + size.height - circleSize, circleSize, circleSize);
    [bottomLeftCircle addAnimation:animation forKey:@"animation"];
    [layer addSublayer:bottomLeftCircle];

    // Bottom-right circle
    CALayer *bottomRightCircle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeRing
                                                                      size:CGSizeMake(circleSize, circleSize) 
                                                                     color:color];
    [self changeAnimation:animation values:@[@"{0,0}", @"{-fx,0}", @"{-hx,-fy}", @"{0,0}"] deltaX:deltaX deltaY:deltaY];
    bottomRightCircle.frame = CGRectMake(x + size.width - circleSize, y + size.height - circleSize, circleSize, circleSize);
    [bottomRightCircle addAnimation:animation forKey:@"animation"];
    [layer addSublayer:bottomRightCircle];
}

- (void)changeAnimation:(CAKeyframeAnimation *)animation values:(NSArray<NSString *> *)rawValues deltaX:(CGFloat)deltaX deltaY:(CGFloat)deltaY {
    NSMutableArray *values = [NSMutableArray arrayWithCapacity:rawValues.count];

    for (NSString *rawValue in rawValues) {
        NSString *translatedString = [self translateString:rawValue deltaX:deltaX deltaY:deltaY];
        CGPoint point = CGPointFromString(translatedString);
        [values addObject:[NSValue valueWithCATransform3D:CATransform3DMakeTranslation(point.x, point.y, 0)]];
    }
    animation.values = values;
}

- (NSString *)translateString:(NSString *)valueString deltaX:(CGFloat)deltaX deltaY:(CGFloat)deltaY {
    NSMutableString *valueMutableString = [NSMutableString stringWithString:valueString];
    CGFloat fullDeltaX = 2 * deltaX;
    CGFloat fullDeltaY = 2 * deltaY;

    [valueMutableString replaceOccurrencesOfString:@"hx" 
                                        withString:[NSString stringWithFormat:@"%.2f", deltaX] 
                                           options:NSCaseInsensitiveSearch 
                                             range:NSMakeRange(0, valueMutableString.length)];
    
    [valueMutableString replaceOccurrencesOfString:@"fx" 
                                        withString:[NSString stringWithFormat:@"%.2f", fullDeltaX] 
                                           options:NSCaseInsensitiveSearch 
                                             range:NSMakeRange(0, valueMutableString.length)];
    
    [valueMutableString replaceOccurrencesOfString:@"hy" 
                                        withString:[NSString stringWithFormat:@"%.2f", deltaY] 
                                           options:NSCaseInsensitiveSearch 
                                             range:NSMakeRange(0, valueMutableString.length)];
    
    [valueMutableString replaceOccurrencesOfString:@"fy" 
                                        withString:[NSString stringWithFormat:@"%.2f", fullDeltaY] 
                                           options:NSCaseInsensitiveSearch 
                                             range:NSMakeRange(0, valueMutableString.length)];

    return [valueMutableString copy];
}

@end
