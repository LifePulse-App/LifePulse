#import "NVActivityIndicatorAnimationBallScaleMultiple.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationBallScaleMultiple

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CFTimeInterval duration = 1.0 / speedMultiplier;
    CFTimeInterval beginTime = CACurrentMediaTime();
    NSArray *beginTimes = @[@0, @0.2, @0.4];
    
    // Scale animation
    CABasicAnimation *scaleAnimation = [CABasicAnimation animationWithKeyPath:@"transform.scale"];
    scaleAnimation.duration = duration;
    scaleAnimation.fromValue = @0;
    scaleAnimation.toValue = @1;
    
    // Opacity animation
    CAKeyframeAnimation *opacityAnimation = [CAKeyframeAnimation animationWithKeyPath:@"opacity"];
    opacityAnimation.duration = duration;
    opacityAnimation.keyTimes = @[@0, @0.05, @1];
    opacityAnimation.values = @[@0, @1, @0];
    
    // Animation group
    CAAnimationGroup *animation = [CAAnimationGroup animation];
    animation.animations = @[scaleAnimation, opacityAnimation];
    animation.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear];
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    // Draw balls
    for (int i = 0; i < 3; i++) {
        CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircle size:size color:color];
        CGRect frame = CGRectMake((layer.bounds.size.width - size.width) / 2,
                                 (layer.bounds.size.height - size.height) / 2,
                                 size.width,
                                 size.height);
        
        animation.beginTime = beginTime + [beginTimes[i] doubleValue];
        circle.frame = frame;
        circle.opacity = 0;
        [circle addAnimation:animation forKey:@"animation"];
        [layer addSublayer:circle];
    }
}

@end
