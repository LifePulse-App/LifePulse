#import "NVActivityIndicatorAnimationSemiCircleSpin.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationSemiCircleSpin

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CFTimeInterval duration = 0.6 / speedMultiplier;
    
    // Animation
    CAKeyframeAnimation *animation = [CAKeyframeAnimation animationWithKeyPath:@"transform.rotation.z"];
    animation.keyTimes = @[@0, @0.5, @1];
    animation.values = @[@0, @(M_PI), @(2 * M_PI)];
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    // Draw circle
    CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircleSemi 
                                                                 size:size 
                                                                color:color];
    CGRect frame = CGRectMake((layer.bounds.size.width - size.width) / 2,
                             (layer.bounds.size.height - size.height) / 2,
                             size.width,
                             size.height);
    circle.frame = frame;
    [circle addAnimation:animation forKey:@"animation"];
    [layer addSublayer:circle];
}

@end
