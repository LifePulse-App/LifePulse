#import "NVActivityIndicatorAnimationBallZigZag.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationBallZigZag

- (void)circleAtFrame:(CGRect)frame layer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color animation:(CAAnimation *)animation {
    CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircle size:size color:color];
    circle.frame = frame;
    [circle addAnimation:animation forKey:@"animation"];
    [layer addSublayer:circle];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CGFloat circleSize = size.width / 5;
    CFTimeInterval duration = 0.7 / speedMultiplier;
    CGFloat deltaX = size.width / 2 - circleSize / 2;
    CGFloat deltaY = size.height / 2 - circleSize / 2;
    CGRect frame = CGRectMake((layer.bounds.size.width - circleSize) / 2, 
                             (layer.bounds.size.height - circleSize) / 2, 
                             circleSize, 
                             circleSize);
    
    // Circle 1 animation
    CAKeyframeAnimation *animation = [CAKeyframeAnimation animationWithKeyPath:@"transform"];
    animation.keyTimes = @[@0, @0.33, @0.66, @1];
    animation.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear];
    animation.values = @[
        [NSValue valueWithCATransform3D:CATransform3DMakeTranslation(0, 0, 0)],
        [NSValue valueWithCATransform3D:CATransform3DMakeTranslation(-deltaX, -deltaY, 0)],
        [NSValue valueWithCATransform3D:CATransform3DMakeTranslation(deltaX, -deltaY, 0)],
        [NSValue valueWithCATransform3D:CATransform3DMakeTranslation(0, 0, 0)]
    ];
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    // Draw circle 1
    [self circleAtFrame:frame layer:layer size:CGSizeMake(circleSize, circleSize) color:color animation:animation];
    
    // Circle 2 animation
    animation.values = @[
        [NSValue valueWithCATransform3D:CATransform3DMakeTranslation(0, 0, 0)],
        [NSValue valueWithCATransform3D:CATransform3DMakeTranslation(deltaX, deltaY, 0)],
        [NSValue valueWithCATransform3D:CATransform3DMakeTranslation(-deltaX, deltaY, 0)],
        [NSValue valueWithCATransform3D:CATransform3DMakeTranslation(0, 0, 0)]
    ];
    
    // Draw circle 2
    [self circleAtFrame:frame layer:layer size:CGSizeMake(circleSize, circleSize) color:color animation:animation];
}

@end
