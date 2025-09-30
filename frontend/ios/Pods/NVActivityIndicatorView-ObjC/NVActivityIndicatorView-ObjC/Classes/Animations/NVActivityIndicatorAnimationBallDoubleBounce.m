#import "NVActivityIndicatorAnimationBallDoubleBounce.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationBallDoubleBounce

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CFTimeInterval duration = 2.0 / speedMultiplier;
    NSArray *beginTimes = @[@0, @1.0];
    CAMediaTimingFunction *timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseInEaseOut];
    
    // Scale animation
    CAKeyframeAnimation *animation = [CAKeyframeAnimation animationWithKeyPath:@"transform.scale"];
    animation.keyTimes = @[@0, @0.5, @1];
    animation.timingFunctions = @[timingFunction, timingFunction];
    animation.values = @[@1, @0, @1];
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    // Draw two circles
    for (int i = 0; i < 2; i++) {
        CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircle 
                                                                     size:size 
                                                                    color:color];
        CGRect frame = CGRectMake((layer.bounds.size.width - size.width) / 2,
                                 (layer.bounds.size.height - size.height) / 2,
                                 size.width,
                                 size.height);
        circle.frame = frame;
        circle.opacity = 0.6;
        
        animation.beginTime = CACurrentMediaTime() + [beginTimes[i] doubleValue];
        [circle addAnimation:animation forKey:@"animation"];
        [layer addSublayer:circle];
    }
}

@end
