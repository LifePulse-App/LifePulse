#import "NVActivityIndicatorAnimationBallRotateChase.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationBallRotateChase

- (CAAnimationGroup *)rotateAnimationWithRate:(float)rate x:(CGFloat)x y:(CGFloat)y size:(CGSize)size speedMultiplier:(CGFloat)speedMultiplier {
    CFTimeInterval duration = 1.5 / speedMultiplier;
    float fromScale = 1 - rate;
    float toScale = 0.2 + rate;
    CAMediaTimingFunction *timeFunc = [CAMediaTimingFunction functionWithControlPoints:(0.5) :(0.15 + rate) :(0.25) :(1)];
    
    // Scale animation
    CABasicAnimation *scaleAnimation = [CABasicAnimation animationWithKeyPath:@"transform.scale"];
    scaleAnimation.duration = duration;
    scaleAnimation.repeatCount = HUGE_VALF;
    scaleAnimation.fromValue = @(fromScale);
    scaleAnimation.toValue = @(toScale);
    
    // Position animation
    CAKeyframeAnimation *positionAnimation = [CAKeyframeAnimation animationWithKeyPath:@"position"];
    positionAnimation.duration = duration;
    positionAnimation.repeatCount = HUGE_VALF;
    
    UIBezierPath *path = [UIBezierPath bezierPathWithArcCenter:CGPointMake(x, y) 
                                                        radius:size.width / 2 
                                                    startAngle:3 * M_PI * 0.5 
                                                      endAngle:3 * M_PI * 0.5 + 2 * M_PI 
                                                     clockwise:YES];
    positionAnimation.path = path.CGPath;
    
    // Animation group
    CAAnimationGroup *animation = [CAAnimationGroup animation];
    animation.animations = @[scaleAnimation, positionAnimation];
    animation.timingFunction = timeFunc;
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;
    
    return animation;
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CGFloat circleSize = size.width / 5;
    
    // Draw circles
    for (int i = 0; i < 5; i++) {
        float factor = (float)i * 1.0 / 5.0;
        CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircle 
                                                                     size:CGSizeMake(circleSize, circleSize) 
                                                                    color:color];
        CAAnimationGroup *animation = [self rotateAnimationWithRate:factor 
                                                                  x:layer.bounds.size.width / 2 
                                                                  y:layer.bounds.size.height / 2 
                                                               size:CGSizeMake(size.width - circleSize, size.height - circleSize)
                                                      speedMultiplier:speedMultiplier];
        
        circle.frame = CGRectMake(0, 0, circleSize, circleSize);
        [circle addAnimation:animation forKey:@"animation"];
        [layer addSublayer:circle];
    }
}

@end
