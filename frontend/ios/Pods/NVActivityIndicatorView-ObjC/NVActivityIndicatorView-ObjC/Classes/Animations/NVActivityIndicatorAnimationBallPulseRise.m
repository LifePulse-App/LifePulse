#import "NVActivityIndicatorAnimationBallPulseRise.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationBallPulseRise

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CGFloat circleSpacing = 2.0;
    CGFloat circleSize = (size.width - 4 * circleSpacing) / 5;
    CGFloat x = (layer.bounds.size.width - size.width) / 2;
    CGFloat y = (layer.bounds.size.height - circleSize) / 2;
    CGFloat deltaY = size.height / 2;
    CFTimeInterval duration = 1.0 / speedMultiplier;
    CAMediaTimingFunction *timingFunction = [CAMediaTimingFunction functionWithControlPoints:0.15 :0.46 :0.9 :0.6];
    
    CAAnimationGroup *oddAnimation = [self oddAnimationWithDuration:duration deltaY:deltaY timingFunction:timingFunction];
    CAAnimationGroup *evenAnimation = [self evenAnimationWithDuration:duration deltaY:deltaY timingFunction:timingFunction];
    
    // Draw circles
    for (int i = 0; i < 5; i++) {
        CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircle 
                                                                     size:CGSizeMake(circleSize, circleSize) 
                                                                    color:color];
        CGRect frame = CGRectMake(x + circleSize * i + circleSpacing * i,
                                 y,
                                 circleSize,
                                 circleSize);
        
        circle.frame = frame;
        if (i % 2 == 0) {
            [circle addAnimation:evenAnimation forKey:@"animation"];
        } else {
            [circle addAnimation:oddAnimation forKey:@"animation"];
        }
        [layer addSublayer:circle];
    }
}

- (CAAnimationGroup *)oddAnimationWithDuration:(CFTimeInterval)duration deltaY:(CGFloat)deltaY timingFunction:(CAMediaTimingFunction *)timingFunction {
    // Scale animation
    CAKeyframeAnimation *scaleAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.scale"];
    scaleAnimation.keyTimes = @[@0, @0.5, @1];
    scaleAnimation.timingFunctions = @[timingFunction, timingFunction];
    scaleAnimation.values = @[@0.4, @1.1, @0.75];
    scaleAnimation.duration = duration;
    
    // Translate animation
    CAKeyframeAnimation *translateAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.translation.y"];
    translateAnimation.keyTimes = @[@0, @0.25, @0.75, @1];
    translateAnimation.timingFunctions = @[timingFunction, timingFunction, timingFunction];
    translateAnimation.values = @[@0, @(deltaY), @(-deltaY), @0];
    translateAnimation.duration = duration;
    
    CAAnimationGroup *animation = [CAAnimationGroup animation];
    animation.animations = @[scaleAnimation, translateAnimation];
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    return animation;
}

- (CAAnimationGroup *)evenAnimationWithDuration:(CFTimeInterval)duration deltaY:(CGFloat)deltaY timingFunction:(CAMediaTimingFunction *)timingFunction {
    // Scale animation
    CAKeyframeAnimation *scaleAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.scale"];
    scaleAnimation.keyTimes = @[@0, @0.5, @1];
    scaleAnimation.timingFunctions = @[timingFunction, timingFunction];
    scaleAnimation.values = @[@1.1, @0.4, @1];
    scaleAnimation.duration = duration;
    
    // Translate animation
    CAKeyframeAnimation *translateAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.translation.y"];
    translateAnimation.keyTimes = @[@0, @0.25, @0.75, @1];
    translateAnimation.timingFunctions = @[timingFunction, timingFunction, timingFunction];
    translateAnimation.values = @[@0, @(-deltaY), @(deltaY), @0];
    translateAnimation.duration = duration;
    
    CAAnimationGroup *animation = [CAAnimationGroup animation];
    animation.animations = @[scaleAnimation, translateAnimation];
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    return animation;
}

@end
