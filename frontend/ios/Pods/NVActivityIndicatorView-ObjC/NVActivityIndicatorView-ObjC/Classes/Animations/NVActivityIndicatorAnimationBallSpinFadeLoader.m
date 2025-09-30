#import "NVActivityIndicatorAnimationBallSpinFadeLoader.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationBallSpinFadeLoader

- (CALayer *)circleAtAngle:(CGFloat)angle size:(CGFloat)size origin:(CGPoint)origin containerSize:(CGSize)containerSize color:(UIColor *)color {
    CGFloat radius = containerSize.width / 2 - size / 2;
    CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircle
                                                                size:CGSizeMake(size, size)
                                                               color:color];
    CGRect frame = CGRectMake(origin.x + radius * (cos(angle) + 1),
                             origin.y + radius * (sin(angle) + 1),
                             size,
                             size);
    circle.frame = frame;
    return circle;
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CGFloat circleSpacing = -2.0;
    CGFloat circleSize = (size.width - 4 * circleSpacing) / 5;
    CGFloat x = (layer.bounds.size.width - size.width) / 2;
    CGFloat y = (layer.bounds.size.height - size.height) / 2;
    CFTimeInterval duration = 1.0 / speedMultiplier;
    CFTimeInterval beginTime = CACurrentMediaTime();
    NSArray *beginTimes = @[@0, @0.12, @0.24, @0.36, @0.48, @0.6, @0.72, @0.84];
    
    // Scale animation
    CAKeyframeAnimation *scaleAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.scale"];
    scaleAnimation.keyTimes = @[@0, @0.5, @1];
    scaleAnimation.values = @[@1, @0.4, @1];
    scaleAnimation.duration = duration;
    
    // Opacity animation
    CAKeyframeAnimation *opacityAnimation = [CAKeyframeAnimation animationWithKeyPath:@"opacity"];
    opacityAnimation.keyTimes = @[@0, @0.5, @1];
    opacityAnimation.values = @[@1, @0.3, @1];
    opacityAnimation.duration = duration;
    
    // Animation group
    CAAnimationGroup *animation = [CAAnimationGroup animation];
    animation.animations = @[scaleAnimation, opacityAnimation];
    animation.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear];
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    // Draw circles
    for (int i = 0; i < 8; i++) {
        CALayer *circle = [self circleAtAngle:(M_PI / 4) * i
                                         size:circleSize
                                       origin:CGPointMake(x, y)
                                containerSize:size
                                        color:color];
        
        animation.beginTime = beginTime + [beginTimes[i] doubleValue];
        [circle addAnimation:animation forKey:@"animation"];
        [layer addSublayer:circle];
    }
}

@end
