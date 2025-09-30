#import "NVActivityIndicatorAnimationBallGridPulse.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationBallGridPulse

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CGFloat circleSpacing = 2.0;
    CGFloat circleSize = (size.width - circleSpacing * 2) / 3;
    CGFloat x = (layer.bounds.size.width - size.width) / 2;
    CGFloat y = (layer.bounds.size.height - size.height) / 2;
    NSArray *durations = @[@(0.72/speedMultiplier), @(1.02/speedMultiplier), @(1.28/speedMultiplier), @(1.42/speedMultiplier), @(1.45/speedMultiplier), @(1.18/speedMultiplier), @(0.87/speedMultiplier), @(1.45/speedMultiplier), @(1.06/speedMultiplier)];
    CFTimeInterval beginTime = CACurrentMediaTime();
    NSArray *beginTimes = @[@(-0.06), @0.25, @(-0.17), @0.48, @0.31, @0.03, @0.46, @0.78, @0.45];
    CAMediaTimingFunction *timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionDefault];
    
    // Scale animation
    CAKeyframeAnimation *scaleAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.scale"];
    scaleAnimation.keyTimes = @[@0, @0.5, @1];
    scaleAnimation.timingFunctions = @[timingFunction, timingFunction];
    scaleAnimation.values = @[@1, @0.5, @1];
    
    // Opacity animation
    CAKeyframeAnimation *opacityAnimation = [CAKeyframeAnimation animationWithKeyPath:@"opacity"];
    opacityAnimation.keyTimes = @[@0, @0.5, @1];
    opacityAnimation.timingFunctions = @[timingFunction, timingFunction];
    opacityAnimation.values = @[@1, @0.7, @1];
    
    // Animation group
    CAAnimationGroup *animation = [CAAnimationGroup animation];
    animation.animations = @[scaleAnimation, opacityAnimation];
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    // Draw circles
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircle
                                                                         size:CGSizeMake(circleSize, circleSize)
                                                                        color:color];
            CGRect frame = CGRectMake(x + circleSize * j + circleSpacing * j,
                                     y + circleSize * i + circleSpacing * i,
                                     circleSize,
                                     circleSize);
            
            int index = 3 * i + j;
            animation.duration = [durations[index] doubleValue];
            animation.beginTime = beginTime + [beginTimes[index] doubleValue];
            circle.frame = frame;
            [circle addAnimation:animation forKey:@"animation"];
            [layer addSublayer:circle];
        }
    }
}

@end
