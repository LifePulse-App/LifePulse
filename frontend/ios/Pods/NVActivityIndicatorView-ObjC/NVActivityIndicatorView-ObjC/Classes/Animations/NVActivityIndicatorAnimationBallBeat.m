#import "NVActivityIndicatorAnimationBallBeat.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationBallBeat

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CGFloat circleSpacing = 2.0;
    CGFloat circleSize = (size.width - circleSpacing * 2) / 3;
    CGFloat x = (layer.bounds.size.width - size.width) / 2;
    CGFloat y = (layer.bounds.size.height - circleSize) / 2;
    CFTimeInterval duration = 0.7 / speedMultiplier;
    CFTimeInterval beginTime = CACurrentMediaTime();
    NSArray *beginTimes = @[@0.35, @0, @0.35];
    
    // Scale animation
    CAKeyframeAnimation *scaleAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.scale"];
    scaleAnimation.keyTimes = @[@0, @0.5, @1];
    scaleAnimation.values = @[@1, @0.75, @1];
    scaleAnimation.duration = duration;
    
    // Opacity animation
    CAKeyframeAnimation *opacityAnimation = [CAKeyframeAnimation animationWithKeyPath:@"opacity"];
    opacityAnimation.keyTimes = @[@0, @0.5, @1];
    opacityAnimation.values = @[@1, @0.2, @1];
    opacityAnimation.duration = duration;
    
    // Animation group
    CAAnimationGroup *animation = [CAAnimationGroup animation];
    animation.animations = @[scaleAnimation, opacityAnimation];
    animation.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear];
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
        
        animation.beginTime = beginTime + [beginTimes[i] doubleValue];
        circle.frame = frame;
        [circle addAnimation:animation forKey:@"animation"];
        [layer addSublayer:circle];
    }
}

@end
