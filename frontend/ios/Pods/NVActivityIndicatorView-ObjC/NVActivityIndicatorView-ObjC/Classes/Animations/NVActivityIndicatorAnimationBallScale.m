#import "NVActivityIndicatorAnimationBallScale.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationBallScale

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CFTimeInterval duration = 1.0 / speedMultiplier;
    
    // Scale animation
    CABasicAnimation *scaleAnimation = [CABasicAnimation animationWithKeyPath:@"transform.scale"];
    scaleAnimation.duration = duration;
    scaleAnimation.fromValue = @0;
    scaleAnimation.toValue = @1;
    
    // Opacity animation
    CABasicAnimation *opacityAnimation = [CABasicAnimation animationWithKeyPath:@"opacity"];
    opacityAnimation.duration = duration;
    opacityAnimation.fromValue = @1;
    opacityAnimation.toValue = @0;
    
    // Animation group
    CAAnimationGroup *animation = [CAAnimationGroup animation];
    animation.animations = @[scaleAnimation, opacityAnimation];
    animation.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseInEaseOut];
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    // Draw circle
    CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircle size:size color:color];
    circle.frame = CGRectMake((layer.bounds.size.width - size.width) / 2,
                             (layer.bounds.size.height - size.height) / 2,
                             size.width,
                             size.height);
    [circle addAnimation:animation forKey:@"animation"];
    [layer addSublayer:circle];
}

@end
