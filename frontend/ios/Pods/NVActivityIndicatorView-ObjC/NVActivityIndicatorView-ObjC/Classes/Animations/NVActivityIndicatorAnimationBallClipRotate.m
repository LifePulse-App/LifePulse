#import "NVActivityIndicatorAnimationBallClipRotate.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationBallClipRotate

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CFTimeInterval duration = 0.75 / speedMultiplier;
    
    // Rotation animation
    CABasicAnimation *animation = [CABasicAnimation animationWithKeyPath:@"transform.rotation"];
    animation.fromValue = @0;
    animation.toValue = @(2 * M_PI);
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    animation.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear];
    
    // Draw ring
    CALayer *ring = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeRingTwoHalfVertical 
                                                              size:size 
                                                             color:color];
    CGRect frame = CGRectMake((layer.bounds.size.width - size.width) / 2,
                             (layer.bounds.size.height - size.height) / 2,
                             size.width,
                             size.height);
    ring.frame = frame;
    [ring addAnimation:animation forKey:@"animation"];
    [layer addSublayer:ring];
}

@end
