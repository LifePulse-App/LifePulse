#import "NVActivityIndicatorAnimationPacman.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationPacman

- (void)pacmanInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CGFloat pacmanSize = 2 * size.width / 3;
    CFTimeInterval pacmanDuration = 0.5 / speedMultiplier;
    CAMediaTimingFunction *timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionDefault];
    
    // Stroke start animation
    CAKeyframeAnimation *strokeStartAnimation = [CAKeyframeAnimation animationWithKeyPath:@"strokeStart"];
    strokeStartAnimation.keyTimes = @[@0, @0.5, @1];
    strokeStartAnimation.timingFunctions = @[timingFunction, timingFunction];
    strokeStartAnimation.values = @[@0.125, @0, @0.125];
    strokeStartAnimation.duration = pacmanDuration;
    
    // Stroke end animation
    CAKeyframeAnimation *strokeEndAnimation = [CAKeyframeAnimation animationWithKeyPath:@"strokeEnd"];
    strokeEndAnimation.keyTimes = @[@0, @0.5, @1];
    strokeEndAnimation.timingFunctions = @[timingFunction, timingFunction];
    strokeEndAnimation.values = @[@0.875, @1, @0.875];
    strokeEndAnimation.duration = pacmanDuration;
    
    // Animation group
    CAAnimationGroup *animation = [CAAnimationGroup animation];
    animation.animations = @[strokeStartAnimation, strokeEndAnimation];
    animation.duration = pacmanDuration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    // Draw pacman
    CALayer *pacman = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapePacman 
                                                                 size:CGSizeMake(pacmanSize, pacmanSize) 
                                                                color:color];
    CGRect frame = CGRectMake((layer.bounds.size.width - size.width) / 2,
                             (layer.bounds.size.height - pacmanSize) / 2,
                             pacmanSize,
                             pacmanSize);
    pacman.frame = frame;
    [pacman addAnimation:animation forKey:@"animation"];
    [layer addSublayer:pacman];
}

- (void)circleInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CGFloat circleSize = size.width / 5;
    CFTimeInterval circleDuration = 1.0 / speedMultiplier;
    
    // Translate animation
    CABasicAnimation *translateAnimation = [CABasicAnimation animationWithKeyPath:@"transform.translation.x"];
    translateAnimation.fromValue = @0;
    translateAnimation.toValue = @(-size.width / 2);
    translateAnimation.duration = circleDuration;
    
    // Opacity animation
    CABasicAnimation *opacityAnimation = [CABasicAnimation animationWithKeyPath:@"opacity"];
    opacityAnimation.fromValue = @1;
    opacityAnimation.toValue = @0.7;
    opacityAnimation.duration = circleDuration;
    
    // Animation group
    CAAnimationGroup *animation = [CAAnimationGroup animation];
    animation.animations = @[translateAnimation, opacityAnimation];
    animation.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear];
    animation.duration = circleDuration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    // Draw circle
    CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircle 
                                                                 size:CGSizeMake(circleSize, circleSize) 
                                                                color:color];
    CGRect frame = CGRectMake((layer.bounds.size.width - size.width) / 2 + size.width - circleSize,
                             (layer.bounds.size.height - circleSize) / 2,
                             circleSize,
                             circleSize);
    circle.frame = frame;
    [circle addAnimation:animation forKey:@"animation"];
    [layer addSublayer:circle];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    [self circleInLayer:layer size:size color:color speedMultiplier:speedMultiplier];
    [self pacmanInLayer:layer size:size color:color speedMultiplier:speedMultiplier];
}

@end
