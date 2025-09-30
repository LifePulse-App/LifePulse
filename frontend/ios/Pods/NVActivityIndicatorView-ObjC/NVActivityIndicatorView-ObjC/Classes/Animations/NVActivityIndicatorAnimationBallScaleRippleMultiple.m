#import "NVActivityIndicatorAnimationBallScaleRippleMultiple.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationBallScaleRippleMultiple

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CFTimeInterval duration = 1.25 / speedMultiplier;
    CFTimeInterval beginTime = CACurrentMediaTime();
    NSArray *beginTimes = @[@0, @0.2, @0.4];
    CAMediaTimingFunction *timingFunction = [CAMediaTimingFunction functionWithControlPoints:0.21 :0.53 :0.56 :0.8];
    
    // Scale animation
    CAKeyframeAnimation *scaleAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.scale"];
    scaleAnimation.keyTimes = @[@0, @0.7];
    scaleAnimation.timingFunction = timingFunction;
    scaleAnimation.values = @[@0, @1];
    scaleAnimation.duration = duration;
    
    // Opacity animation
    CAKeyframeAnimation *opacityAnimation = [CAKeyframeAnimation animationWithKeyPath:@"opacity"];
    opacityAnimation.keyTimes = @[@0, @0.7, @1];
    opacityAnimation.timingFunctions = @[timingFunction, timingFunction];
    opacityAnimation.values = @[@1, @0.7, @0];
    opacityAnimation.duration = duration;
    
    // Animation group
    CAAnimationGroup *animation = [CAAnimationGroup animation];
    animation.animations = @[scaleAnimation, opacityAnimation];
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    // Draw circles
    for (int i = 0; i < 3; i++) {
        CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeRing size:size color:color];
        CGRect frame = CGRectMake((layer.bounds.size.width - size.width) / 2,
                                 (layer.bounds.size.height - size.height) / 2,
                                 size.width,
                                 size.height);
        
        animation.beginTime = beginTime + [beginTimes[i] doubleValue];
        circle.frame = frame;
        [circle addAnimation:animation forKey:@"animation"];
        [layer addSublayer:circle];
    }
}

@end
