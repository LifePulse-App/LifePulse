#import "NVActivityIndicatorAnimationBallRotate.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationBallRotate

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CGFloat circleSize = size.width / 5;
    CFTimeInterval duration = 1.0 / speedMultiplier;
    CAMediaTimingFunction *timingFunction = [CAMediaTimingFunction functionWithControlPoints:0.7 :-0.13 :0.22 :0.86];
    
    // Scale animation
    CAKeyframeAnimation *scaleAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.scale"];
    scaleAnimation.keyTimes = @[@0, @0.5, @1];
    scaleAnimation.timingFunctions = @[timingFunction, timingFunction];
    scaleAnimation.values = @[@1, @0.6, @1];
    scaleAnimation.duration = duration;
    
    // Rotate animation
    CAKeyframeAnimation *rotateAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.rotation.z"];
    rotateAnimation.keyTimes = @[@0, @0.5, @1];
    rotateAnimation.timingFunctions = @[timingFunction, timingFunction];
    rotateAnimation.values = @[@0, @(M_PI), @(2 * M_PI)];
    rotateAnimation.duration = duration;
    
    // Animation group
    CAAnimationGroup *animation = [CAAnimationGroup animation];
    animation.animations = @[scaleAnimation, rotateAnimation];
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    // Draw circles
    CALayer *leftCircle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircle 
                                                                     size:CGSizeMake(circleSize, circleSize) 
                                                                    color:color];
    CALayer *rightCircle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircle 
                                                                      size:CGSizeMake(circleSize, circleSize) 
                                                                     color:color];
    CALayer *centerCircle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircle 
                                                                       size:CGSizeMake(circleSize, circleSize) 
                                                                      color:color];
    
    leftCircle.opacity = 0.8;
    leftCircle.frame = CGRectMake(0, (size.height - circleSize) / 2, circleSize, circleSize);
    rightCircle.opacity = 0.8;
    rightCircle.frame = CGRectMake(size.width - circleSize, (size.height - circleSize) / 2, circleSize, circleSize);
    centerCircle.frame = CGRectMake((size.width - circleSize) / 2, (size.height - circleSize) / 2, circleSize, circleSize);
    
    CALayer *circle = [CALayer layer];
    CGRect frame = CGRectMake((layer.bounds.size.width - size.width) / 2, 
                             (layer.bounds.size.height - size.height) / 2, 
                             size.width, 
                             size.height);
    
    circle.frame = frame;
    [circle addSublayer:leftCircle];
    [circle addSublayer:rightCircle];
    [circle addSublayer:centerCircle];
    [circle addAnimation:animation forKey:@"animation"];
    [layer addSublayer:circle];
}

@end
