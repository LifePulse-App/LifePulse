#import "NVActivityIndicatorAnimationBallClipRotatePulse.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationBallClipRotatePulse

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CFTimeInterval duration = 1.0 / speedMultiplier;
    CAMediaTimingFunction *timingFunction = [CAMediaTimingFunction functionWithControlPoints:0.09 :0.57 :0.49 :0.9];

    [self smallCircleWithDuration:duration timingFunction:timingFunction layer:layer size:size color:color];
    [self bigCircleWithDuration:duration timingFunction:timingFunction layer:layer size:size color:color];
}

- (void)smallCircleWithDuration:(CFTimeInterval)duration timingFunction:(CAMediaTimingFunction *)timingFunction layer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    // Animation
    CAKeyframeAnimation *animation = [CAKeyframeAnimation animationWithKeyPath:@"transform.scale"];
    animation.keyTimes = @[@0, @0.3, @1];
    animation.timingFunctions = @[timingFunction, timingFunction];
    animation.values = @[@1, @0.3, @1];
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;

    // Draw circle
    CGFloat circleSize = size.width / 2;
    CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircle size:CGSizeMake(circleSize, circleSize) color:color];
    CGRect frame = CGRectMake((layer.bounds.size.width - circleSize) / 2,
                             (layer.bounds.size.height - circleSize) / 2,
                             circleSize,
                             circleSize);

    circle.frame = frame;
    [circle addAnimation:animation forKey:@"animation"];
    [layer addSublayer:circle];
}

- (void)bigCircleWithDuration:(CFTimeInterval)duration timingFunction:(CAMediaTimingFunction *)timingFunction layer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    // Scale animation
    CAKeyframeAnimation *scaleAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.scale"];
    scaleAnimation.keyTimes = @[@0, @0.5, @1];
    scaleAnimation.timingFunctions = @[timingFunction, timingFunction];
    scaleAnimation.values = @[@1, @0.6, @1];
    scaleAnimation.duration = duration;

    // Rotate animation
    CAKeyframeAnimation *rotateAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.rotation.z"];
    rotateAnimation.keyTimes = scaleAnimation.keyTimes;
    rotateAnimation.timingFunctions = @[timingFunction, timingFunction];
    rotateAnimation.values = @[@0, @(M_PI), @(2 * M_PI)];
    rotateAnimation.duration = duration;

    // Animation
    CAAnimationGroup *animation = [CAAnimationGroup animation];
    animation.animations = @[scaleAnimation, rotateAnimation];
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;

    // Draw circle
    CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeRingTwoHalfVertical size:size color:color];
    CGRect frame = CGRectMake((layer.bounds.size.width - size.width) / 2,
                             (layer.bounds.size.height - size.height) / 2,
                             size.width,
                             size.height);
    circle.frame = frame;
    [circle addAnimation:animation forKey:@"animation"];
    [layer addSublayer:circle];
}

@end
