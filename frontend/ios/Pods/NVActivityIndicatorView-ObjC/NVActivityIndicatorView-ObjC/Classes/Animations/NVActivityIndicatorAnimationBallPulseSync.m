#import "NVActivityIndicatorAnimationBallPulseSync.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationBallPulseSync

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CGFloat circleSpacing = 2.0;
    CGFloat circleSize = (size.width - 2 * circleSpacing) / 3;
    CGFloat x = (layer.bounds.size.width - size.width) / 2;
    CGFloat y = (layer.bounds.size.height - circleSize) / 2;
    CFTimeInterval duration = 0.6 / speedMultiplier;
    CAMediaTimingFunction *timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseInEaseOut];
    
    // Scale animation
    CAKeyframeAnimation *animation = [CAKeyframeAnimation animationWithKeyPath:@"transform.scale"];
    animation.keyTimes = @[@0, @0.3, @0.6, @1];
    animation.timingFunctions = @[timingFunction, timingFunction, timingFunction];
    animation.values = @[@1, @0.3, @1, @1];
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    // Draw circles
    for (int i = 0; i < 3; i++) {
        CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircle 
                                                                     size:CGSizeMake(circleSize, circleSize) 
                                                                    color:color];
        CGRect frame = CGRectMake(x + circleSize * i + circleSpacing * i,
                                 y,
                                 circleSize,
                                 circleSize);
        
        circle.frame = frame;
        [circle addAnimation:animation forKey:@"animation"];
        [layer addSublayer:circle];
    }
}

@end
